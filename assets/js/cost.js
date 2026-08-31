/*
 * openblues.pl/cost/ — the cost calculator.
 *
 * WHY IT EXISTS. Google Forms has no calculated fields, so from the 29 Aug 2026 migration onward
 * there is no live running total inside the signup form. This page and the confirmation email are
 * the only two places a participant ever sees their number, and this is the only one they can see
 * BEFORE they commit. Every print-kit QR code lands somebody who has never heard of Open Blues,
 * and "what does this cost me?" is the first question they ask.
 *
 * PRICE LABEL CONTRACT (POLICY.md — a machine contract, not a style preference). Every priced
 * option label carries exactly one euro amount and it is that option's price. Nothing here holds a
 * price as a number: priceOf() extracts it from the label with the same regex the sheet uses, so
 * the page cannot drift from the form. A label carrying zero or two euro amounts THROWS rather
 * than guessing — a silently mis-priced option sends somebody to Poland with the wrong cash.
 *
 * There is no exception. Sunday night was briefly tier-dependent — its price looked up from the
 * accommodation option, its own labels carrying no euro amount — and on 31 Aug 2026 the form went
 * back to asking it once as a plain three-way choice (€0 / €25 tent or floor / €50 bed), so every
 * question on this page is priced the same way: off the label of the option the reader picked.
 *
 * Loads as a plain <script> in the browser and as a CommonJS module in node, so qa/cost-logic.js
 * drives the same arithmetic the page runs, over all 24 canonical cases, without a browser.
 *
 * No network, no storage, no third parties. The arithmetic is three additions.
 */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.OpenBluesCost = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var EURO_ALL = /€\s?\d+/g;
  var EURO_ONE = /€\s?(\d+)/;

  /** The price of an option, read out of its own label. Throws if the label breaks the contract. */
  function priceOf(label) {
    var text = String(label == null ? '' : label);
    var found = text.match(EURO_ALL) || [];
    if (found.length !== 1) {
      throw new Error(
        'PRICE LABEL CONTRACT broken: "' + text + '" carries ' + found.length + ' euro amounts. ' +
        'Every priced option label must carry exactly one, and it must be that option\'s price ' +
        '(POLICY.md, Fixed values). Fix data/formprefill.json, not this file.');
    }
    return parseInt(found[0].match(EURO_ONE)[1], 10);
  }

  /**
   * questions[] and their options, keyed for lookup, with every price derived from its label.
   */
  function index(config) {
    var byKey = {};
    (config.questions || []).forEach(function (question) {
      var options = {};
      var order = [];
      (question.options || []).forEach(function (option) {
        var priced = {
          key: option.key,
          name: option.name,
          label: option.label,
          price: priceOf(option.label),
          source: option
        };
        options[option.key] = priced;
        order.push(priced);
      });
      byKey[question.key] = { question: question, options: options, order: order };
    });
    return byKey;
  }

  /**
   * choice is { accommodation: 'floor', sunday: 'leaving', donation: 'none' } — option keys.
   * Returns the two numbers the page promises and the lines behind them. There is no fifth
   * number: one accommodation tier, plus the Sunday-night option you picked (€0, €25 or €50),
   * plus a donation if you want to, plus the €50 already transferred.
   */
  function calculate(config, choice) {
    var idx = index(config);
    var lines = (config.questions || []).map(function (question) {
      var picked = idx[question.key].options[(choice || {})[question.key]];
      if (!picked) {
        throw new Error('No option "' + (choice || {})[question.key] + '" for "' + question.key + '"');
      }
      return {
        key: question.key,
        name: picked.name,
        label: picked.label,
        price: picked.price,
        breakdown: question.breakdown || question.key
      };
    });
    var cash = lines.reduce(function (sum, line) { return sum + line.price; }, 0);
    var reservation = priceOf(config.reservationLabel);
    return { lines: lines, cash: cash, reservation: reservation, total: cash + reservation };
  }

  /**
   * The "sign up with these choices" deep link, or '' when the form is not wired yet.
   *
   * Returns '' unless data/formprefill.json carries BOTH a formURL and every entry id. A partial
   * prefill is worse than none: it silently drops a choice the participant thinks they made.
   */
  function prefillURL(config, choice) {
    var base = (config && config.formURL) || '';
    if (!base) return '';
    var idx = index(config);
    var parts = [];
    for (var i = 0; i < config.questions.length; i++) {
      var question = config.questions[i];
      var entry = String(question.entry == null ? '' : question.entry).trim();
      if (!/^\d+$/.test(entry)) return '';
      var picked = idx[question.key].options[(choice || {})[question.key]];
      if (!picked) return '';
      parts.push('entry.' + entry + '=' + encodeURIComponent(picked.label));
    }
    return base + (base.indexOf('?') === -1 ? '?' : '&') + 'usp=pp_url&' + parts.join('&');
  }

  function money(amount) { return '€' + amount; }

  /** The default choice, falling back to each question's first option. */
  function defaults(config) {
    var choice = {};
    (config.questions || []).forEach(function (question) {
      var wanted = (config.defaults || {})[question.key];
      var known = (question.options || []).some(function (o) { return o.key === wanted; });
      choice[question.key] = known ? wanted : (question.options[0] || {}).key;
    });
    return choice;
  }

  var api = {
    priceOf: priceOf,
    calculate: calculate,
    prefillURL: prefillURL,
    money: money,
    defaults: defaults,
    index: index
  };

  // -------------------------------------------------------------------------------------------
  // Browser wiring. Everything above is pure and is what qa/cost-logic.js tests.
  // -------------------------------------------------------------------------------------------

  if (typeof document === 'undefined') return api;

  function readChoice(form, config) {
    var choice = {};
    (config.questions || []).forEach(function (question) {
      var checked = form.querySelector('input[name="ob-' + question.key + '"]:checked');
      choice[question.key] = checked ? checked.value : (question.options[0] || {}).key;
    });
    return choice;
  }

  function start() {
    var form = document.querySelector('[data-cost-form]');
    if (!form) return;
    var configNode = document.getElementById('ob-cost-config');
    if (!configNode) return;

    var config = JSON.parse(configNode.textContent);
    var output = form.querySelector('[data-cost-output]');
    var cashNode = form.querySelector('[data-cost-cash]');
    var totalNode = form.querySelector('[data-cost-total]');
    var breakdownNode = form.querySelector('[data-cost-breakdown]');
    var signupNode = form.querySelector('[data-cost-signup]');

    function update() {
      var result = calculate(config, readChoice(form, config));
      if (cashNode) cashNode.textContent = money(result.cash);
      if (totalNode) totalNode.textContent = money(result.total);
      if (breakdownNode) {
        breakdownNode.textContent = result.lines
          .filter(function (line) { return line.price > 0; })
          .map(function (line) { return money(line.price) + ' ' + line.breakdown; })
          .concat([money(result.reservation) + ' ' + (config.reservationBreakdown || 'Reservation Payment')])
          .join(' + ');
      }
      if (signupNode && signupNode.tagName === 'A') {
        var url = prefillURL(config, readChoice(form, config));
        if (url) signupNode.setAttribute('href', url);
      }
    }

    // The QA driver flips input.checked directly and dispatches a bubbling event on the FIRST
    // input of each group, not on the one it selected — so listen on the form, never per input.
    form.addEventListener('change', update);
    form.addEventListener('input', update);
    if (output) output.hidden = false;
    update();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();

  return api;
}));
