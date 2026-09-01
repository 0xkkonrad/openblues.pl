/*
 * The homepage culture check is deliberately local, private and throwaway.
 * It sends nothing, stores nothing and has no score visible to the participant.
 * Without JavaScript all three fieldsets and the plain-language summary remain readable.
 */
(function () {
  'use strict';

  function start() {
    var root = document.querySelector('[data-culture-check]');
    if (!root) return;

    var form = root.querySelector('[data-culture-form]');
    var questions = Array.prototype.slice.call(root.querySelectorAll('[data-culture-question]'));
    var nav = root.querySelector('[data-culture-nav]');
    var back = root.querySelector('[data-culture-back]');
    var next = root.querySelector('[data-culture-next]');
    var result = root.querySelector('[data-culture-result]');
    var reset = root.querySelector('[data-culture-reset]');
    var current = 0;

    if (!form || questions.length !== 3 || !nav || !back || !next || !result || !reset) return;

    function picked(question) {
      return question.querySelector('input[type="radio"]:checked');
    }

    function updateFeedback(question) {
      var answer = picked(question);
      var feedback = question.querySelector('[data-culture-feedback]');
      if (!feedback) return;

      feedback.textContent = answer ? answer.getAttribute('data-feedback') : '';
      feedback.hidden = !answer;
    }

    function showQuestion(index, moveFocus) {
      current = index;
      result.hidden = true;
      nav.hidden = false;

      questions.forEach(function (question, questionIndex) {
        question.hidden = questionIndex !== current;
      });

      back.hidden = current === 0;
      next.textContent = current === questions.length - 1 ? 'See my result' : 'Next question';
      next.disabled = !picked(questions[current]);
      updateFeedback(questions[current]);

      if (moveFocus) {
        var legend = questions[current].querySelector('legend');
        if (legend) legend.focus();
      }
    }

    function showResult() {
      var aligned = questions.reduce(function (total, question) {
        var answer = picked(question);
        return total + (answer && answer.hasAttribute('data-aligned') ? 1 : 0);
      }, 0);
      var tier = aligned >= 2 ? 'high' : aligned === 1 ? 'middle' : 'low';
      var panels = Array.prototype.slice.call(result.querySelectorAll('[data-result-tier]'));
      var active = result.querySelector('[data-result-tier="' + tier + '"]');

      questions.forEach(function (question) { question.hidden = true; });
      nav.hidden = true;
      panels.forEach(function (panel) { panel.hidden = panel !== active; });
      result.hidden = false;

      var heading = active && active.querySelector('h4');
      if (heading) heading.focus();
    }

    questions.forEach(function (question) {
      question.addEventListener('change', function (event) {
        if (!event.target.matches('input[type="radio"]')) return;
        updateFeedback(question);
        if (question === questions[current]) next.disabled = false;
      });
    });

    back.addEventListener('click', function () {
      if (current > 0) showQuestion(current - 1, true);
    });

    next.addEventListener('click', function () {
      if (!picked(questions[current])) return;
      if (current === questions.length - 1) showResult();
      else showQuestion(current + 1, true);
    });

    reset.addEventListener('click', function () {
      form.reset();
      questions.forEach(function (question) {
        var feedback = question.querySelector('[data-culture-feedback]');
        if (!feedback) return;
        feedback.textContent = '';
        feedback.hidden = true;
      });
      Array.prototype.slice.call(result.querySelectorAll('[data-result-tier]')).forEach(function (panel) {
        panel.hidden = true;
      });
      showQuestion(0, true);
    });

    form.addEventListener('submit', function (event) { event.preventDefault(); });
    root.classList.add('culture-check--enhanced');
    showQuestion(0, false);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
}());
