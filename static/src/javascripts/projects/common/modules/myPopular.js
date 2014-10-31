define([
    'common/utils/storage',
    'lodash/arrays/zip',
    'lodash/collections/groupBy',
    'lodash/collections/reduce',
    'lodash/collections/map'
], function (
    storage,
    zip,
    groupBy,
    reduce,
    map
) {
    var storagePrefix = 'gu.mypopular.';
    var store = storage.local;
    var keywordCountsStorageKey = storagePrefix + 'counts';
    var keywordCountsCache;

    /**
     * This updates the keyword counts, and expires old data as needed
     *
     * @param oldKeywordCounts list: [keyword/tag id, name, count], first item is the most recent
     * @param currentKeywordMap map: key -> name
     * @param maxKeywordsToStore the limit to expire them after
     * @returns {*} the updated keyword counts
     */
    function prepareLog(oldKeywordCounts, currentKeywordMap, maxKeywordsToStore) { // TODO can we guarantee a 1:1 mapping names to ids?
        var keywordCountsPartitionedByUpdateNeeded = groupBy(oldKeywordCounts, function(item) {
            return currentKeywordMap.hasOwnProperty(item['id'])
        });
        var unchangedKeywordCounts = keywordCountsPartitionedByUpdateNeeded[false] || [];
        var toChangeKeywordCounts = groupBy(keywordCountsPartitionedByUpdateNeeded[true] || [], function(item) {
            return item['id']
        });
        var changedKeywordCounts = map(Object.keys(currentKeywordMap), function(id) {
            var oldCount = toChangeKeywordCounts[id] ? toChangeKeywordCounts[id][0]['count'] : 0;
            return {id: id, name: currentKeywordMap[id], count: oldCount + 1}
        });
        return changedKeywordCounts.concat(unchangedKeywordCounts).slice(0, maxKeywordsToStore)
    }

    // minimal impure functions go inside here
    return {

        MAX_KEYWORDS_TO_STORE: 500,

      //  populateBar: populateBar,
        prepareLog: prepareLog, // TODO only for testing... a better way?

        log: function(sectionId, sectionName, keywordIds, keywordNames) {
            var keywordMap = reduce(zip(keywordIds, keywordNames).unshift([sectionId, sectionName]), function(result, kv) { return result[kv[0]] = kv[1] })
            if (!keywordCountsCache) {
                keywordCountsCache = storage.local.get(keywordCountsStorageKey) || []
            }
            keywordCountsCache = prepareLog(keywordCountsCache, keywordMap, MAX_KEYWORDS_TO_STORE)
            storage.local.set(keywordCountsStorageKey, keywordCountsCache)
        },

        populateBar: function() {

        }

    };
});
