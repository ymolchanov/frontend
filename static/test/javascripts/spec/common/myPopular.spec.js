define(["jasq"], function (require) {

//    var entryFixture = {
//        position: {
//            x: 2,
//            y: 3
//        },
//        direction: 'across',
//        length: 2,
//        number: 15
//    };

    describe('My Popular bar testing', 'common/modules/myPopular', function () {

        describe('prepareLog', function () {

            it('should not change the map for a page with no tags', function (myPopular) {
                var before = []
                var data = {}
                var expected = []
                expect(myPopular.prepareLog(before, data, 10)).toEqual(expected);
            });

            it('should add a page with a tag afresh', function (myPopular) {
                var before = []
                var data = {'tagid': 'tag name'}
                var expected = [{id: 'tagid', name: 'tag name', count: 1}]
                expect(myPopular.prepareLog(before, data, 10)).toEqual(expected);
            });

            it('should add a page with a tag to an existing', function (myPopular) {
                var before = [{id: 'tagid', name: 'tag name', count: 1}]
                var data = {'tagid': 'tag name'}
                var expected = [{id: 'tagid', name: 'tag name', count: 2}]
                expect(myPopular.prepareLog(before, data, 10)).toEqual(expected);
            });

            it('should not lose an existing', function (myPopular) {
                var before = [{id: 'tagid', name: 'tag name', count: 1}]
                var data = {}
                var expected = [{id: 'tagid', name: 'tag name', count: 1}]
                expect(myPopular.prepareLog(before, data, 10)).toEqual(expected);
            });

            it('should not lose an existing when you add another and the order should be right', function (myPopular) {
                var before = [{id: 'tagid', name: 'tag name', count: 1}]
                var data = {'newtagid': 'tag name2'}
                var expected = [{id: 'newtagid', name: 'tag name2', count: 1}, {id: 'tagid', name: 'tag name', count: 1}]
                expect(myPopular.prepareLog(before, data, 10)).toEqual(expected);
            });

            it('should cap the log size', function (myPopular) {
                var before = [{id: 'tagid', name: 'tag name', count: 1}]
                var data = {'newtagid': 'tag name2'}
                var expected = [{id: 'newtagid', name: 'tag name2', count: 1}]
                expect(myPopular.prepareLog(before, data, 1)).toEqual(expected);
            });

        });

    });
});
