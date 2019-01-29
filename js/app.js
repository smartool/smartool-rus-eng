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
var spellout_m = {};


var app = new Vue({
    el: '#app',
    data: {
        counter: 0,
        num_words: 0,
        level: '',
        topic: '',
        word: '',
        voice: 'Male',
        show_translation: false,
        levels: []
    },
    computed: {
        topics: function() {
            var l = [];
            if (this.level in topics_m) {
                l = Array.from(topics_m[this.level]);
            }
            l.sort();
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
        previous_word: function() {
            this.counter -= 1;
            if (this.counter < 0) {
                this.counter = this.num_words - 1;
            }
            this.word = this.words[this.counter];
        },
        next_word: function() {
            this.counter += 1;
            if (this.counter > (this.num_words - 1)) {
                this.counter = 0;
            }
            this.word = this.words[this.counter];
        },
        sentence_with_emphasis: function(s, w) {
            var i = s.toLowerCase().indexOf(w.toLowerCase());
            if (i > -1) {
                return [
                    s.slice(0, i),
                    "<span class='highlight'>",
                    s.slice(i, i + w.length),
                    "</span>",
                    s.slice(i + w.length)
                ].join('');
            }
            return s;
        },
        spellout: function(abbreviation) {
            return spellout_m[abbreviation];
        },
        play_voice: function(s) {
            responsiveVoice.speak(s, "Russian " + this.voice);
        },
        stop_voice: function() {
            responsiveVoice.cancel();
        }
    },
    created: function() {
        var vm = this
        var levels = new Set();
        var num_successful_requests = 0;
        var files = [
            'SMARTool_data_A1_LIZA.csv',
            'SMARTool_data_A1_VALYA.csv',
            'SMARTool_data_A1_ZHENYA.csv',
            'SMARTool_data_A2_LIZA.csv',
            'SMARTool_data_A2_VALYA.csv',
            'SMARTool_data_A2_ZHENYA.csv',
            'SMARTool_data_B1_VALYA.csv',
            'SMARTool_data_B1_ZHENYA.csv'
        ];
        for (var file of files) {
            var url = 'https://raw.githubusercontent.com/valentina-zh/SMARTool-data/master/' + file;
            Papa.parse(url, {
                download: true,
                header: true,
                complete: function(results) {
                    num_successful_requests++;
                    for (var i = 0; i < results.data.length; i++) {

                        if (results.data[i]['Lemma'] == '') { continue; }

                        var level = results.data[i]['Level'];
                        if (level.trim() == '') { continue; }

                        levels.add(level);
                        var word = results.data[i]['Lemma'];
                        var sentence_russian = results.data[i]['Example Sentence'];

                        // with this we exclude sentences like "-", or ""
                        // in other words we exclude unfinished examples
                        if (sentence_russian.length < 2) { continue; }

                        var sentence_english = results.data[i]['Translation'];
                        var form = results.data[i]['Form'];
                        var analysis = results.data[i]['Analysis'];

                        var topics_comma_separated = results.data[i]['Topic(s)'];
                        var topics = topics_comma_separated.split(', ')
                        for (var _topic of topics) {
                            var topic = _topic.trim();
                            topics_m = append(topics_m, level, topic);
                            words_m = append(words_m, [level, topic], word);
                            sentences_m = append(sentences_m,
                                [level, topic, word],
                                [sentence_russian, sentence_english, form, analysis]);
                        }
                    }
                    if (num_successful_requests == files.length) {
                        vm.levels = Array.from(levels);
                        vm.levels.sort();
                    }
                }
            });
            Papa.parse('https://raw.githubusercontent.com/valentina-zh/SMARTool-data/master/SMARTool_data_Abbreviations.csv', {
                download: true,
                header: true,
                complete: function(results) {
                    for (var i = 0; i < results.data.length; i++) {
                        var abbreviation = results.data[i]['Abbreviation'];
                        var spellout = results.data[i]['Spellout'];
                        spellout_m[abbreviation] = spellout;
                    }
                }
            });
        }
    }
})
