/*
 * openblues.pl/spread-the-word/ — "Bring your city".
 *
 * WHY IT EXISTS. The page's job is to turn a reader into somebody who does one concrete thing in
 * their own city. The friction in the way of that is writing the words, so every block on the
 * page is already written; this file does the one piece of personalisation that makes them feel
 * like the reader's rather than ours — the city name — and puts the text in the clipboard.
 *
 * PROGRESSIVE ENHANCEMENT, and the reason for the odd-looking `hidden` in the markup. Without
 * JavaScript the paste blocks still say everything they need to: the city renders as the literal
 * slot "[your city]", which anybody can overwrite after pasting. What would be a lie without
 * JavaScript is a name field that changes nothing and a Copy button that copies nothing, so the
 * field ships hidden and is unhidden here, and the buttons are created here.
 *
 * No network, no storage, no third parties. Nothing about who typed which city leaves this page:
 * the site has no analytics of any kind and this is not the place to start (qa/no-trackers.js).
 */
(function () {
  'use strict';

  var kit = document.querySelector('[data-city-kit]');
  if (!kit) return;

  var slots = kit.querySelectorAll('[data-city-slot]');
  var form = kit.querySelector('[data-city-form]');
  var input = kit.querySelector('[data-city-input]');
  // The slot text as authored ("[your city]"), so clearing the field restores it rather than
  // leaving a sentence with a hole in it.
  var placeholder = slots.length ? slots[0].textContent : '';

  if (form && input) {
    form.hidden = false;
    input.addEventListener('input', function () {
      var city = input.value.trim();
      for (var i = 0; i < slots.length; i += 1) slots[i].textContent = city || placeholder;
      kit.className = city ? 'city city-named' : 'city';
    });
  }

  /* A paste block as text: its paragraphs, joined by blank lines. That is what somebody expects
     to land in a Facebook description or a chat message — not the DOM's own whitespace. */
  function textOf(block) {
    var lines = block.querySelectorAll('[data-city-line]');
    var parts = [];
    for (var i = 0; i < lines.length; i += 1) parts.push(lines[i].textContent.trim());
    return parts.join('\n\n');
  }

  /* Clipboard, with the old path kept for browsers that have no async clipboard (and for any
     context where it is refused). If both fail the caller selects the text instead, so there is
     always a way to get the words out. */
  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      var scratch = document.createElement('textarea');
      scratch.value = text;
      scratch.setAttribute('readonly', '');
      scratch.style.position = 'fixed';
      scratch.style.top = '-1000px';
      document.body.appendChild(scratch);
      scratch.select();
      var copied = false;
      try {
        copied = document.execCommand('copy');
      } catch (error) {
        copied = false;
      }
      document.body.removeChild(scratch);
      if (copied) resolve();
      else reject(new Error('clipboard unavailable'));
    });
  }

  function selectBlock(block) {
    var text = block.querySelector('.copy-text');
    if (!text || !window.getSelection || !document.createRange) return;
    var range = document.createRange();
    range.selectNodeContents(text);
    var selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  }

  function addCopyButton(block) {
    var label = block.getAttribute('data-city-copy') || 'text';
    var head = block.querySelector('.copy-head') || block;

    var status = document.createElement('span');
    status.className = 'copy-status';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');

    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn btn-outline btn-small copy-btn';
    button.textContent = 'Copy';
    button.setAttribute('aria-label', 'Copy ' + label.toLowerCase());

    var timer = null;
    function say(message) {
      status.textContent = message;
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(function () { status.textContent = ''; }, 3000);
    }

    button.addEventListener('click', function () {
      copyText(textOf(block)).then(
        function () { say('Copied'); },
        function () { selectBlock(block); say('Selected — press Ctrl/Cmd + C'); }
      );
    });

    head.appendChild(button);
    head.appendChild(status);
  }

  var blocks = kit.querySelectorAll('[data-city-copy]');
  for (var b = 0; b < blocks.length; b += 1) addCopyButton(blocks[b]);
}());
