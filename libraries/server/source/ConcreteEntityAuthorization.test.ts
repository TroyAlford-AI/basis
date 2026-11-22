import { describe, expect, test } from 'bun:test'
import { compileEntityQuery } from './Database'
import { Action, Graph, Security } from './Graph'

const read = { [Action.Read]: Security.Public } as const

/**
 * Normalize generated identifiers and numbers for structural comparison.
 * @param sql - Generated SQL.
 * @returns Normalized SQL.
 */
function normalize(sql: string): string {
  return sql.replace(/"[a-z]+\d+"/g, '"alias"').replace(/\b\d+\b/g, 'N')
}

/**
 * Count physical Entity joins in generated SQL.
 * @param sql - Generated SQL.
 * @returns Join count.
 */
function countEntities(sql: string): number {
  return (sql.match(/JOIN "Entity"/g) ?? []).length
}

const documentGraph = new Graph({
  entities: [
    {
      fields: [{ field: 'createdAt', type: 'Timestamp' }],
      name: 'Account',
    },
    {
      fields: [
        { field: 'createdAt', type: 'Timestamp' },
        { field: 'owner', target: 'Account', type: 'Entity' },
      ],
      name: 'Workspace',
      security: read,
    },
    {
      fields: [{ field: 'workspace', target: 'Workspace', type: 'Entity' }],
      name: 'Document',
      security: read,
    },
  ],
})

const inverseGraph = new Graph({
  entities: [
    {
      fields: [
        {
          cardinality: 'One',
          field: 'primaryDocument',
          inverse: 'workspace',
          target: 'Document',
          type: 'Inverse',
        },
      ],
      name: 'Workspace',
      security: read,
    },
    {
      fields: [
        {
          field: 'workspace',
          inverse: 'primaryDocument',
          target: 'Workspace',
          type: 'Entity',
        },
      ],
      name: 'Document',
      security: read,
    },
  ],
})

const collectionGraph = new Graph({
  entities: [
    {
      fields: [
        {
          field: 'printings',
          target: 'Printing',
          type: 'Collection',
          via: 'DeckPrinting[deck = @].printing',
        },
      ],
      name: 'Deck',
      security: read,
    },
    {
      fields: [{ field: 'title', type: 'String' }],
      name: 'Printing',
      security: read,
    },
  ],
  relationships: [{
    between: [
      { field: 'deck', target: 'Deck' },
      { field: 'printing', target: 'Printing' },
    ],
    fields: [{ field: 'quantity', type: 'Number' }],
    name: 'DeckPrinting',
  }],
})

describe('concrete entity SQL shape', () => {
  test('groups a concrete reference with its root row', () => {
    const { sql } = compileEntityQuery(documentGraph.definitions, 'Document', {
      fields: ['id', 'workspace', 'workspace.name'],
    })
    expect(sql).toContain('LEFT JOIN ("Workspace"')
    expect(sql).toContain('INNER JOIN "Entity"')
    expect(sql).toContain('t."workspace.id"')
    expect(sql).not.toContain('LEFT JOIN "Workspace"')
    expect(sql).not.toContain('JOIN "Account"')
  })

  test('reuses one reference occurrence for repeated fields', () => {
    const { sql } = compileEntityQuery(documentGraph.definitions, 'Document', {
      fields: ['workspace', 'workspace.name', 'workspace.createdAt', 'workspace.owner.id'],
    })
    expect((sql.match(/\("Workspace"/g) ?? [])).toHaveLength(1)
    expect((sql.match(/INNER JOIN "Entity"/g) ?? [])).toHaveLength(2)
    expect((sql.match(/"Account"/g) ?? [])).toHaveLength(1)
  })

  test('groups concrete inverse references', () => {
    const { sql } = compileEntityQuery(inverseGraph.definitions, 'Workspace', {
      fields: ['id', 'primaryDocument', 'primaryDocument.name'],
    })
    expect(sql).toContain('LEFT JOIN ("Document"')
    expect(sql).toContain('INNER JOIN "Entity"')
    expect((sql.match(/JOIN "Entity"/g) ?? [])).toHaveLength(1)
  })

  test('orders a concrete collection relation from the edge to the target and root', () => {
    const { sql } = compileEntityQuery(collectionGraph.definitions, 'Deck', {
      fields: ['id', 'printings{$limit:null}', 'printings.title', 'printings.quantity'],
    })
    const edge = sql.search(/FROM\s+"DeckPrinting"/)
    const target = sql.indexOf('JOIN "Printing"', edge)
    const root = sql.indexOf('JOIN "Entity"', target)
    expect(edge).toBeGreaterThan(-1)
    expect(target).toBeGreaterThan(edge)
    expect(root).toBeGreaterThan(target)
    expect(sql).toContain('"quantity"')
    expect((sql.match(/JOIN "Entity"/g) ?? []).length).toBeGreaterThan(0)
  })

  test('keeps genuinely polymorphic references on the Entity path', () => {
    const graph = new Graph({
      entities: [
        { fields: [], name: 'Thing' },
        {
          fields: [{ field: 'target', target: 'Entity', type: 'Entity' }],
          name: 'Link',
        },
      ],
    })
    const { sql } = compileEntityQuery(graph.definitions, 'Link', {
      fields: ['id', 'target', 'target.name'],
    })
    expect(sql).toContain('LEFT JOIN "Entity"')
    expect(sql).toContain('target__entity')
    expect(sql).not.toContain('JOIN "Thing"')
  })

  test('is deterministic and retains bound values', () => {
    const options = {
      fields: ['id', 'workspace.name'],
      where: { 'workspace.name': 'Ada' },
    } as const
    const first = compileEntityQuery(documentGraph.definitions, 'Document', options)
    const second = compileEntityQuery(documentGraph.definitions, 'Document', options)
    expect(first).toEqual(second)
    expect(first.values).toEqual(['Ada', 25, 0])
  })

  test('generates one discriminator-dispatched Entity read policy', () => {
    const graph = new Graph({
      entities: Array.from({ length: 20 }, (_, index) => ({
        fields: [{ field: 'label', type: 'String' }],
        name: `Readable${index}`,
        security: read,
      })),
    })
    const schema = graph.physicalSchema('basis_app', true)
    const policy = schema.policies.find(candidate => (
      candidate.table === 'Entity' && candidate.command === 'SELECT'
    ))
    expect(policy?.sql).toContain('public.entity_readable("Entity"."entity", "Entity"."id")')
    expect(policy?.sql).not.toContain('EXISTS')
    expect(policy?.sql).not.toContain("entity = 'Readable")

    const dispatcher = schema.functions.find(candidate => candidate.name === 'entity_readable')
    expect(dispatcher?.sql).toContain('LANGUAGE plpgsql STABLE SECURITY DEFINER')
    expect(dispatcher?.sql).toContain('search_path = public, basis, pg_temp')
    expect(dispatcher?.sql).toContain('CASE root_entity')
    expect(dispatcher?.sql).toContain("WHEN 'Readable0'")
    expect(dispatcher?.sql).toContain("WHEN 'Readable19'")
    expect(dispatcher?.sql).toContain('ELSE')
    expect(dispatcher?.sql).toContain('RETURN FALSE')
    expect(dispatcher?.body).not.toContain('entity_readable(')
    expect(dispatcher?.signature).toBe('root_entity text, root_id text')
    expect(dispatcher?.securityDefiner).toBe(true)

    expect(schema.grants).toContainEqual(expect.objectContaining({
      function: 'entity_readable',
      grantee: 'basis_app',
      privilege: 'EXECUTE',
    }))
    expect(schema.grants).toContainEqual(expect.objectContaining({
      function: 'entity_readable',
      grantee: 'PUBLIC',
      kind: 'revoke',
      privilege: 'EXECUTE',
    }))
  })

  test('does not grow concrete query SQL when unrelated entities are added', () => {
    const small = compileEntityQuery(documentGraph.definitions, 'Document', {
      fields: ['id', 'workspace', 'workspace.name'],
    })
    const large = new Graph({
      entities: [
        ...(documentGraph.definitions.entities
          .filter(entity => ['Account', 'Workspace', 'Document'].includes(entity.name))
          .map(entity => ({
            fields: entity.effectiveFields
              .filter(field => !['id', 'name', 'entity', 'lastUpdatedAt', 'lastUpdatedBy'].includes(field.name))
              .map(field => (field.type === 'Entity'
                ? { field: field.name, target: field.target, type: field.type }
                : { field: field.name, type: field.type })),
            name: entity.name,
            security: read,
          }))),
        ...Array.from({ length: 20 }, (_, index) => ({
          fields: [{ field: 'label', type: 'String' }],
          name: `Unrelated${index}`,
          security: read,
        })),
      ] as never,
    })
    const expanded = compileEntityQuery(large.definitions, 'Document', {
      fields: ['id', 'workspace', 'workspace.name'],
    })
    expect(normalize(expanded.sql)).toBe(normalize(small.sql))
    expect(countEntities(expanded.sql)).toBe(countEntities(small.sql))
  })
})

const nestedGraph = new Graph({
  entities: [
    {
      fields: [{
        field: 'printings',
        target: 'Printing',
        type: 'Collection',
        via: 'DeckPrinting[deck = @].printing',
      }],
      name: 'Deck',
    },
    {
      fields: [
        { field: 'card', target: 'Card', type: 'Entity' },
        {
          cardinality: 'Many',
          field: 'panels',
          inverse: 'printing',
          target: 'Panel',
          type: 'Inverse',
        },
      ],
      name: 'Printing',
    },
    {
      fields: [
        {
          cardinality: 'Many',
          field: 'faces',
          inverse: 'card',
          target: 'Face',
          type: 'Inverse',
        },
      ],
      name: 'Card',
    },
    {
      fields: [{ field: 'card', inverse: 'faces', target: 'Card', type: 'Entity' }],
      name: 'Face',
    },
    {
      fields: [
        { field: 'printing', inverse: 'panels', target: 'Printing', type: 'Entity' },
        { field: 'art', target: 'Art', type: 'Entity' },
      ],
      name: 'Panel',
    },
    { fields: [], name: 'Art' },
  ],
  relationships: [{
    between: [
      { field: 'deck', target: 'Deck' },
      { field: 'printing', target: 'Printing' },
    ],
    fields: [{ field: 'quantity', type: 'Number' }],
    name: 'DeckPrinting',
  }],
})

test('keeps the nested MTG-shaped projection proportional to its occurrences', () => {
  const { sql } = compileEntityQuery(nestedGraph.definitions, 'Deck', {
    fields: [
      'id',
      'printings{$limit:null}',
      'printings.quantity',
      'printings.card',
      'printings.card.name',
      'printings.card.faces{$limit:null}',
      'printings.card.faces.name',
      'printings.panels{$limit:null}',
      'printings.panels.art.name',
    ],
  })
  expect(sql).toContain('FROM "Deck"')
  expect(sql).toContain('JOIN "Printing"')
  expect(sql).toContain('("Card"')
  expect(sql).toContain('FROM "Panel"')
  expect(sql).toContain('("Art"')
  expect(sql).not.toContain("entity = '")
  expect(countEntities(sql)).toBeGreaterThan(0)
  expect(countEntities(sql)).toBeLessThan(40)
})
