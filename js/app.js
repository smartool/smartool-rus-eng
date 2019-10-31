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
var map_level_to_topics = {};
var map_level_to_words = {};
var map_level_topic_to_words = {};
var map_level_word_to_sentences = {};
var map_level_topic_word_to_sentences = {};
var map_level_analysis_to_sentences = {};
var map_abbreviation_to_spellout = {};
var map_level_to_analyses = {};
var map_word_to_translation = {};
var map_topic_to_translation = {};


var app = new Vue({
    el: '#app',
    data: {
        mode: 'by_topic',
        counter: 0,
        num_words: 0,
        level: '',
        topic: '',
        analysis: '',
        word: '',
        voice: 'Male',
        show_translation: false,
        levels: []
    },
    computed: {
        topics: function() {
            var l = [];
            if (this.level in map_level_to_topics) {
                l = Array.from(map_level_to_topics[this.level]);
            }
            l.sort();
            return l;
        },
        analyses: function() {
            var l = [];
            if (this.level in map_level_to_analyses) {
                l = Array.from(map_level_to_analyses[this.level]);
            }
            l.sort();
            return l;
        },
        words_by_level: function() {
            var l = [];
            var t = [this.level];
            if (t in map_level_to_words) {
                l = Array.from(map_level_to_words[t]);
            }
            l.sort();
            return l;
        },
        words_by_level_topic: function() {
            var l = [];
            var t = [this.level, this.topic];
            if (t in map_level_topic_to_words) {
                l = Array.from(map_level_topic_to_words[t]);
            }
            this.counter = 0;
            this.num_words = l.length;
            this.word = l[0];
            return l;
        },
        sentences: function() {
            var l = [];
            if (this.mode == 'by_topic') {
                var t = [this.level, this.topic, this.word];
                if (t in map_level_topic_word_to_sentences) {
                    l = Array.from(map_level_topic_word_to_sentences[t]);
                }
            }
            if (this.mode == 'by_analysis') {
                var t = [this.level, this.analysis];
                if (t in map_level_analysis_to_sentences) {
                    l = Array.from(map_level_analysis_to_sentences[t]);
                }
            }
            if (this.mode == 'by_word') {
                var t = [this.level, this.word];
                if (t in map_level_word_to_sentences) {
                    l = Array.from(map_level_word_to_sentences[t]);
                }
            }
            return l;
        }
    },
    methods: {
        select_mode: function(mode) {
            this.mode = mode;
        },
        previous_word: function() {
            this.counter -= 1;
            if (this.counter < 0) {
                this.counter = this.num_words - 1;
            }
            this.word = this.words_by_level_topic[this.counter];
        },
        next_word: function() {
            this.counter += 1;
            if (this.counter > (this.num_words - 1)) {
                this.counter = 0;
            }
            this.word = this.words_by_level_topic[this.counter];
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
        translate_word: function(word) {
            return map_word_to_translation[word];
        },
        translate_topic: function(topic) {
            return map_topic_to_translation[topic];
        },
        analysis_spellout: function(abbreviation) {
            return map_abbreviation_to_spellout[abbreviation];
        },
        play_voice: function(s) {
            responsiveVoice.speak(s, "Russian " + this.voice);
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
            'SMARTool_data_B1_LIZA.csv',
            'SMARTool_data_B1_VALYA.csv',
            'SMARTool_data_B1_ZHENYA.csv',
            'SMARTool_data_B2_LIZA.csv',
            'SMARTool_data_B2_VALYA.csv',
            'SMARTool_data_B2_ZHENYA.csv'
        ];
        for (var file of files) {
            var url = 'https://raw.githubusercontent.com/smartool/data-russian-english/master/' + file;
            Papa.parse(url, {
                download: true,
                header: true,
                complete: function(results) {
                    num_successful_requests++;
                    for (var i = 0; i < results.data.length; i++) {

                        if (results.data[i]['Lemma'] == '') {
                            continue;
                        }

                        var level = results.data[i]['Level'];
                        if (level.trim() == '') {
                            continue;
                        }

                        levels.add(level);
                        var word = results.data[i]['Lemma'];
                        var sentence_russian = results.data[i]['Example Sentence'];

                        // with this we exclude sentences like "-", or ""
                        // in other words we exclude unfinished examples
                        if (sentence_russian.length < 2) {
                            continue;
                        }

                        var translation = results.data[i]['Eng Gloss'];
                        map_word_to_translation[word] = translation;
                        map_level_to_words = append(map_level_to_words, level, word);
                        map_level_to_words = append(map_level_to_words, 'all levels', word);

                        var sentence_english = results.data[i]['Translation'];
                        var form = results.data[i]['Form'];
                        var analysis = results.data[i]['Analysis'];

                        map_level_to_analyses = append(map_level_to_analyses, level, analysis);
                        map_level_to_analyses = append(map_level_to_analyses, 'all levels', analysis);
                        map_level_analysis_to_sentences = append(map_level_analysis_to_sentences,
                            [level, analysis],
                            [sentence_russian, sentence_english, form, analysis]);
                        map_level_analysis_to_sentences = append(map_level_analysis_to_sentences,
                            ['all levels', analysis],
                            [sentence_russian, sentence_english, form, analysis]);
                        map_level_word_to_sentences = append(map_level_word_to_sentences,
                            [level, word],
                            [sentence_russian, sentence_english, form, analysis]);
                        map_level_word_to_sentences = append(map_level_word_to_sentences,
                            ['all levels', word],
                            [sentence_russian, sentence_english, form, analysis]);

                        var topics_comma_separated = results.data[i]['Topic(s)'];
                        var topics = topics_comma_separated.split(', ')
                        for (var _topic of topics) {
                            var topic = _topic.trim();
                            map_level_to_topics = append(map_level_to_topics, level, topic);
                            map_level_to_topics = append(map_level_to_topics, 'all levels', topic);
                            map_level_topic_to_words = append(map_level_topic_to_words, [level, topic], word);
                            map_level_topic_to_words = append(map_level_topic_to_words, ['all levels', topic], word);
                            map_level_topic_word_to_sentences = append(map_level_topic_word_to_sentences,
                                [level, topic, word],
                                [sentence_russian, sentence_english, form, analysis]);
                            map_level_topic_word_to_sentences = append(map_level_topic_word_to_sentences,
                                ['all levels', topic, word],
                                [sentence_russian, sentence_english, form, analysis]);
                        }
                    }
                    if (num_successful_requests == files.length) {
                        vm.levels = Array.from(levels);
                        vm.levels.sort();
                    }
                }
            });
            levels.add('all levels');
            Papa.parse('https://raw.githubusercontent.com/smartool/data-russian-english/master/SMARTool_data_Abbreviations.csv', {
                download: true,
                header: true,
                complete: function(results) {
                    for (var i = 0; i < results.data.length; i++) {
                        var abbreviation = results.data[i]['Abbreviation'];
                        var spellout = results.data[i]['Spellout'];
                        map_abbreviation_to_spellout[abbreviation] = spellout;
                    }
                }
            });
            Papa.parse('https://raw.githubusercontent.com/smartool/data-russian-english/master/SMARTool_data_Topics.csv', {
                download: true,
                header: true,
                complete: function(results) {
                    for (var i = 0; i < results.data.length; i++) {
                        var topic = results.data[i]['Topic'];
                        var translation = results.data[i]['Translation'];
                        map_topic_to_translation[topic] = translation;
                    }
                }
            });
        }
    }
})
