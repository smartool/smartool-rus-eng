// we put all the js code into an anonymous function
// this is good practice to isolate the namespace
; (function() {


// with this we make js less forgiving so that we catch
// more hidden errors during development
'use strict';


var app = new Vue({
  el: '#app',
  data: {
    message: 'loading data ...'
  },
  created: function () {
    var vm = this
    Papa.parse("https://raw.githubusercontent.com/bast/twirll-prototype/gh-pages/example.csv", {
      download: true,
      complete: function(results) {
        vm.message = results.data[13][0]
      }
    });
  }
})


// close the anonymous function
})();
