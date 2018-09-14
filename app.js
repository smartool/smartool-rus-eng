// we put all the js code into an anonymous function
// this is good practice to isolate the namespace
;
(function() {


    // with this we make js less forgiving so that we catch
    // more hidden errors during development
    'use strict';


    function append(m, k, v) {
        if (m.has(k)) {
            var s = m.get(k);
        } else {
            var s = new Set();
        }

        s.add(v);
        m.set(k, s);

        return m;
    }


    // we use Set and Map but they are not fully supported by vue
    // one can get away with Array.from() but this does not allow to modify
    // the Map and Set data but here we are ok since these are read at the first page load
    // and considered read-only
    var topics_m = new Map();
    var words_m = new Map();


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
                if (topics_m.has(this.level)) {
                    l = Array.from(topics_m.get(this.level));
                }
                return l;
            },
            words: function() {
                var l = [];
                var t = [this.level, this.topic];
                console.log(t, words_m.has(t))
                if (words_m.has(t)) {
                    l = Array.from(words_m.get(t));
                }
                return l;
            }
        },
        created: function() {
            var vm = this
            Papa.parse("https://raw.githubusercontent.com/bast/twirll-prototype/4a7006960d90687c2f63b541d220a3a843dfc818/example.csv", {
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
                            var t = [level, topic];
                            words_m = append(words_m, t, word);
                            console.log(t, words_m.has(t))
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
