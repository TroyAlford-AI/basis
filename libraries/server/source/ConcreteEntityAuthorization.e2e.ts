import { expect, setDefaultTimeout, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import type { DatabaseTestOptions } from '../testing/DatabaseFixture'
import { withDatabase } from '../testing/DatabaseFixture'
import { Action, Graph, Security } from './Graph'

setDefaultTimeout(60_000)

const alice = randomUUID()
const bob = randomUUID()
const workspace = randomUUID()
const permittedDocument = randomUUID()
const optionalDocument = randomUUID()
const privateArt = randomUUID()
const unrelatedArt = randomUUID()
const officialCard = randomUUID()

const graph = new Graph({
  entities: [
    {
      fields: [],
      name: 'User',
      security: { [Action.Read]: { where: 'id = $me' } },
    },
    {
      fields: [
        {
          field: 'members',
          target: 'User',
          type: 'Collection',
          via: 'WorkspaceMembership[workspace = @].user',
        },
        {
          cardinality: 'Many',
          field: 'documents',
          inverse: 'workspace',
          target: 'Document',
          type: 'Inverse',
        },
      ],
      name: 'Workspace',
      security: { [Action.Read]: { where: 'members $contains (id = $me)' } },
    },
    {
      fields: [
        {
          field: 'workspace',
          inverse: 'documents',
          target: 'Workspace',
          type: 'Entity',
        },
        { field: 'backup', nullable: true, target: 'Art', type: 'Entity' },
      ],
      name: 'Document',
      security: { [Action.Read]: { where: 'workspace.members $contains (id = $me)' } },
    },
    {
      fields: [{ field: 'owner', target: 'User', type: 'Entity' }],
      name: 'Art',
      security: { [Action.Read]: { where: 'owner = $me' } },
    },
    {
      fields: [],
      name: 'OfficialCard',
      security: { [Action.Read]: Security.Public },
    },
  ],
  relationships: [{
    between: [
      { field: 'workspace', target: 'Workspace' },
      { field: 'user', target: 'User' },
    ],
    fields: [{ field: 'role', type: 'String' }],
    name: 'WorkspaceMembership',
  }],
})

const options: DatabaseTestOptions = {
  graph,
  setup: async database => {
    await database.create('User', { id: alice, name: 'Alice' })
    await database.create('User', { id: bob, name: 'Bob' })
    await database.create('Workspace', { id: workspace, name: 'Shared' })
    await database.sql`
      INSERT INTO "WorkspaceMembership" ("workspace.id", "user.id", "role")
      VALUES (${workspace}, ${alice}, 'member')
    `
    await database.create('Art', { id: privateArt, name: 'Bob private art', owner: bob })
    await database.create('Art', { id: unrelatedArt, name: 'Alice private art', owner: alice })
    await database.create('Document', {
      id: permittedDocument,
      name: 'Permitted',
      workspace,
    })
    await database.create('Document', {
      backup: privateArt,
      id: optionalDocument,
      name: 'Optional backup',
      workspace,
    })
    await database.create('OfficialCard', { id: officialCard, name: 'Public card' })
  },
}

test('shows a concrete reference only to authorized members', async () => {
  await withDatabase('concrete-member', alice, async database => {
    expect((await database.query('Document', {
      fields: ['id', 'name', 'workspace.name'],
      limit: null,
      where: { id: permittedDocument },
    }))).toEqual([{
      id: permittedDocument,
      name: 'Permitted',
      workspace: { entity: 'Workspace', id: workspace, name: 'Shared' },
    }])
  }, options)
})

test('does not drop a parent when an optional target is private', async () => {
  await withDatabase('concrete-optional-parent', alice, async database => {
    expect(await database.query('Document', {
      fields: ['id', 'name', 'backup.name'],
      where: { id: optionalDocument },
    })).toEqual([{ backup: null, id: optionalDocument, name: 'Optional backup' }])
  }, options)
})

test('fails closed for nonmembers and keeps public leaves readable', async () => {
  await withDatabase('concrete-nonmember', bob, async database => {
    expect(await database.query('Document', { fields: ['id'], limit: null })).toEqual([])
    expect(await database.query('Workspace', { fields: ['id'], limit: null })).toEqual([])
    expect(await database.query('OfficialCard', { fields: ['id'], limit: null }))
      .toEqual([{ id: officialCard }])
    await expect(database.query('OfficialCard', {
      fields: ['id'],
      where: { id: officialCard },
    })).resolves.toEqual([{ id: officialCard }])
  }, options)
})

test('does not expose private ids through direct Entity reads', async () => {
  await withDatabase('concrete-root-read', bob, async database => {
    const rows = await database.sql<{ id: string }[]>`
      SELECT "id"
      FROM "Entity"
      ORDER BY "id"
    `
    const ids = rows.map(row => row.id)
    expect(ids).toContain(bob)
    expect(ids).toContain(officialCard)
    expect(ids).not.toContain(alice)
    expect(ids).not.toContain(workspace)
    expect(ids).not.toContain(permittedDocument)
    expect(ids).not.toContain(optionalDocument)
    expect(ids).toContain(privateArt)
    expect(ids).not.toContain(unrelatedArt)

    const [unknown] = await database.sql<{ readable: boolean }[]>`
      SELECT entity_readable('NoSuchEntity', ${randomUUID()}) AS "readable"
    `
    expect(unknown?.readable).toBe(false)
  }, options)
})

test('does not leak nested collection members or counts', async () => {
  await withDatabase('concrete-nested-collection', bob, async database => {
    const rows = await database.query<{ documents: { $matched: number, $total: number } }>('Workspace', {
      fields: ['id', 'documents{$limit:null}', 'documents.name'],
      limit: null,
    })
    expect(rows).toEqual([])
  }, options)
})
