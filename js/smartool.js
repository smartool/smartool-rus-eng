// with this we make js less forgiving so that we catch
// more hidden errors during development
'use strict';


// https://stackoverflow.com/a/24457420
function is_integer(value) {
    return /^-{0,1}\d+$/.test(value);
}


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


function load_data(args) {
    var app = new Vue({
        el: '#app',
        data: {
            target_language: args.target_language,
            user_language: args.user_language,
            mode: 'by_topic',
            level_selection: args.level_selection, // Level | Lesson
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
                // https://stackoverflow.com/a/9645447
                l.sort(function(a, b) {
                    return a.toLowerCase().localeCompare(b.toLowerCase());
                });
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
                responsiveVoice.speak(s, args.target_language + " " + this.voice);
            }
        },
        created: function() {
            var vm = this
            var levels = new Set();
            if (vm.level_selection == 'Level') {
                var all_levels = 'all levels';
            } else {
                var all_levels = 'all lessons';
            }
            var num_successful_requests = 0;
            var files = args.data_files;
            for (var file of files) {
                var url = args.data_url_prefix + file;
                Papa.parse(url, {
                    download: true,
                    header: true,
                    complete: function(results) {
                        num_successful_requests++;
                        for (var i = 0; i < results.data.length; i++) {

                            if (results.data[i]['Target language lemma'] == '') {
                                continue;
                            }

                            if (vm.level_selection == 'Level') {
                                var level = results.data[i]['Level'];
                                if (level.trim() == '') {
                                    continue;
                                }
                            } else {
                                if (!('Lesson' in results.data[i])) {
                                    continue;
                                }
                                var level = results.data[i]['Lesson'];
                                if (is_integer(level)) {
                                    level = parseInt(level, 10);
                                } else {
                                    continue;
                                }
                            }

                            levels.add(level);
                            var word = results.data[i]['Target language lemma'];
                            var sentence_russian = results.data[i]['Target language example sentence'];

                            // with this we exclude sentences like "-", or ""
                            // in other words we exclude unfinished examples
                            if (sentence_russian.length < 2) {
                                continue;
                            }

                            var translation = results.data[i]['User language gloss'];
                            map_word_to_translation[word] = translation;
                            map_level_to_words = append(map_level_to_words, level, word);
                            map_level_to_words = append(map_level_to_words, all_levels, word);

                            var sentence_english = results.data[i]['User language translation'];
                            var form = results.data[i]['Form'];
                            var analysis = results.data[i]['Analysis'];

                            map_level_to_analyses = append(map_level_to_analyses, level, analysis);
                            map_level_to_analyses = append(map_level_to_analyses, all_levels, analysis);
                            map_level_analysis_to_sentences = append(map_level_analysis_to_sentences,
                                [level, analysis],
                                [sentence_russian, sentence_english, form, analysis]);
                            map_level_analysis_to_sentences = append(map_level_analysis_to_sentences,
                                [all_levels, analysis],
                                [sentence_russian, sentence_english, form, analysis]);
                            map_level_word_to_sentences = append(map_level_word_to_sentences,
                                [level, word],
                                [sentence_russian, sentence_english, form, analysis]);
                            map_level_word_to_sentences = append(map_level_word_to_sentences,
                                [all_levels, word],
                                [sentence_russian, sentence_english, form, analysis]);

                            var topics_comma_separated = results.data[i]['Topic(s)'];
                            var topics = topics_comma_separated.split(', ')
                            for (var _topic of topics) {
                                var topic = _topic.trim();
                                map_level_to_topics = append(map_level_to_topics, level, topic);
                                map_level_to_topics = append(map_level_to_topics, all_levels, topic);
                                map_level_topic_to_words = append(map_level_topic_to_words, [level, topic], word);
                                map_level_topic_to_words = append(map_level_topic_to_words, [all_levels, topic], word);
                                map_level_topic_word_to_sentences = append(map_level_topic_word_to_sentences,
                                    [level, topic, word],
                                    [sentence_russian, sentence_english, form, analysis]);
                                map_level_topic_word_to_sentences = append(map_level_topic_word_to_sentences,
                                    [all_levels, topic, word],
                                    [sentence_russian, sentence_english, form, analysis]);
                            }
                        }
                        if (num_successful_requests == files.length) {
                            vm.levels = Array.from(levels);
                            if (vm.level_selection == 'Level') {
                                vm.levels.sort();
                            } else {
                                var collator = new Intl.Collator(undefined, {
                                    numeric: true,
                                    sensitivity: 'base'
                                });
                                // the collator is used to obtain natural sorting
                                // see https://stackoverflow.com/a/38641281
                                vm.levels.sort(collator.compare);
                            }
                        }
                    }
                });
                levels.add(all_levels);
                Papa.parse(args.data_url_prefix + args.abbreviations_file, {
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
                Papa.parse(args.data_url_prefix + args.data_topics_file, {
                    download: true,
                    header: true,
                    complete: function(results) {
                        for (var i = 0; i < results.data.length; i++) {
                            var topic = results.data[i]['Topic'];
                            var translation = results.data[i]['User language translation'];
                            map_topic_to_translation[topic] = translation;
                        }
                    }
                });
            }
        }
    })
}