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
    var sentences_m = {};


    var app = new Vue({
        el: '#app',
        data: {
            counter: 0,
            num_words: 0,
            level: '',
            topic: '',
            word: '',
            show_translation: false,
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
                this.counter = 0;
                this.num_words = l.length;
                this.word = l[0];
                return l;
            },
            sentences: function() {
                var l = [];
                var t = [this.level, this.topic, this.word];
                if (t in sentences_m) {
                    l = Array.from(sentences_m[t]);
                }
                return l;
            }
        },
        methods: {
            next_word: function(event) {
                this.counter += 1;
                if (this.counter > (this.num_words - 1)) {
                    this.counter = 0;
                }
                this.word = this.words[this.counter];
            }
        },
        created: function() {
            var vm = this
            Papa.parse("https://raw.githubusercontent.com/bast/twirll-prototype/d7fb5c18a4d55e92421ed5aabe3e2127ba885c1e/data/example.csv", {
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

                            var sentence_russian = results.data[i]['Example Sentence'];
                            var sentence_english = results.data[i]['Translation'];
                            var analysis = results.data[i]['Analysis'];

                            sentences_m = append(sentences_m,
                                                 [level, topic, word],
                                                 [sentence_russian, sentence_english, analysis]);
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
