// we put all the js code into an anonymous function
// this is good practice to isolate the namespace
;
(function() {


    // with this we make js less forgiving so that we catch
    // more hidden errors during development
    'use strict';


    function append(o, k, v) {
        if (k in o) {
            var s = o[k];
        } else {
            var s = new Set();
        }

        s.add(v);
        o[k] = s;

        return o;
    }


    // sets are not fully supported by vue
    // one can get away with Array.from() but this does not allow to modify
    // the set data but here we are ok since these are read at the first page load
    // and considered read-only
    var topics_m = {};
    var words_m = {};


    var app = new Vue({
        el: '#app',
        data: {
            level: '',
            topic: '',
            word: '',
            levels: []
        },
        computed: {
            topics: function() {
                var l = [];
                if (this.level in topics_m) {
                    l = Array.from(topics_m[this.level]);
                }
                return l;
            },
            words: function() {
                var l = [];
                var t = [this.level, this.topic];
                if (t in words_m) {
                    l = Array.from(words_m[t]);
                }
                return l;
            }
        },
        created: function() {
            var vm = this
            Papa.parse("https://raw.githubusercontent.com/bast/twirll-prototype/e9dac74e0944be83dc13e6b03f06035a261dce93/example.csv", {
                download: true,
                header: true,
                complete: function(results) {

                    var levels = new Set();
                    for (var i = 0; i < results.data.length; i++) {
                        if (results.data[i]['Lemma'] != '') {
                            var level = results.data[i]['Level'];
                            levels.add(level);
                            var topic = results.data[i]['Topic(s)'];
                            var word = results.data[i]['Lemma'];
                            topics_m = append(topics_m, level, topic);
                            words_m = append(words_m, [level, topic], word);
                        }
                    }

                    vm.message = results.data[1];
                    vm.levels = Array.from(levels);
                }
            });
        }
    })


    // close the anonymous function
})();
