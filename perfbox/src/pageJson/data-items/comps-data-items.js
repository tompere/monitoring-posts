const _ = require('lodash')

const PAGE_DATA_KEYS = ['component_properties', 'document_data', 'design_data', 'behaviors_data']

const SCHEMAS = PAGE_DATA_KEYS.reduce(
  (res, dataType) =>
    _.merge(res, {
      [dataType]: _(require(`./schemas/${dataType}.json`))
        .keys()
        .value(),
    }),
  {}
)

function columnName({ id, dataType, schemaDataType }) {
  return `${id}_${dataType}_${schemaDataType}_total_items`
}

function calcCompItemsByType({ id, page }, dataType) {
  const compItemsByType = _.countBy(page.data[dataType], comp => comp.type)
  return SCHEMAS[dataType].map(schemaDataType => ({
    [columnName({ id, dataType, schemaDataType })]: compItemsByType[schemaDataType] || 0,
  }))
}

function execJson({ masterPage, page }) {
  return _(PAGE_DATA_KEYS)
    .map(dataType =>
      _.concat(
        calcCompItemsByType({ id: 'mp', page: masterPage }, dataType),
        calcCompItemsByType({ id: 'p', page }, dataType)
      )
    )
    .flatMap()
    .value()
    .reduce((res, obj) => ({ ...res, ...obj }), {})
}

/**
 * counts occurences of schemas types in json
 */
module.exports = { execJson }
