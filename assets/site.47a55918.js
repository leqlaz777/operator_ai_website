/* OperatorAI saytı: mobil menyu, qənaət kalkulyatoru, müraciət forması (WhatsApp / e-poçt). */
(function () {
  'use strict'
  var d = document
  var reduced = false
  try { reduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) } catch (e) { reduced = false }
  if (!reduced) d.documentElement.classList.add('js')

  /* ---------- Mobil menyu ---------- */
  var header = d.querySelector('.site-header')
  var toggle = d.querySelector('.nav-toggle')
  function setMenu(open) {
    if (!header || !toggle) return
    header.classList.toggle('is-open', open)
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false')
    toggle.setAttribute('aria-label', open ? toggle.getAttribute('data-close') : toggle.getAttribute('data-open'))
  }
  if (toggle) {
    toggle.addEventListener('click', function () { setMenu(!header.classList.contains('is-open')) })
    d.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && header.classList.contains('is-open')) { setMenu(false); toggle.focus() }
    })
    Array.prototype.forEach.call(d.querySelectorAll('.nav a'), function (a) {
      a.addEventListener('click', function () { setMenu(false) })
    })
  }

  /* ---------- Rəqəm formatı ---------- */
  function fmt(n, lang, dec) {
    var fixed = Number(n).toFixed(dec || 0)
    var parts = fixed.split('.')
    var sep = lang === 'en' ? ',' : ' '
    var int = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, sep)
    return parts[1] ? int + (lang === 'en' ? '.' : ',') + parts[1] : int
  }
  function money(n, lang, dec) {
    return fmt(n, lang, dec) + (lang === 'en' ? ' AZN' : ' ₼')
  }

  /* ---------- Qənaət kalkulyatoru ---------- */
  var roi = d.querySelector('[data-roi]')
  if (roi) {
    var cfg = JSON.parse(roi.getAttribute('data-roi'))
    var L = cfg.lang
    var el = function (sel) { return roi.querySelector(sel) }
    var out = function (name) { return roi.querySelector('[data-out="' + name + '"]') }
    // Operator sayı qədər eyni anda zəng verən ilk paket (lines null — limitsiz).
    var autoPlan = function (ops) {
      for (var i = 0; i < cfg.plans.length; i++) {
        if (cfg.plans[i].lines == null || ops <= cfg.plans[i].lines) return cfg.plans[i]
      }
      return cfg.plans[cfg.plans.length - 1]
    }
    var update = function () {
      var ops = Math.max(1, parseInt(el('#roi-ops').value, 10) || 1)
      var cost = Math.max(0, parseFloat(el('#roi-cost').value) || 0)
      var ai = parseFloat(el('#roi-ai').value) || 0
      var planId = el('#roi-plan').value
      var plan = planId === 'auto' ? autoPlan(ops) : cfg.plans.filter(function (p) { return p.id === planId })[0]
      var api = (roi.querySelector('input[name="support"]:checked') || {}).value !== 'basic'
      var minutes = ops * cfg.talk
      var now = ops * cost
      var aiCost = minutes * ai
      var support = api ? plan.apiMonth : plan.supportYear / 12
      var next = aiCost + support
      var save = now - next

      Array.prototype.forEach.call(roi.querySelectorAll('input[type="range"]'), function (r) {
        var min = parseFloat(r.min), max = parseFloat(r.max)
        r.style.setProperty('--fill', ((parseFloat(r.value) - min) / (max - min) * 100).toFixed(1) + '%')
      })
      el('#roi-ops-out').textContent = String(ops)
      el('#roi-ai-out').textContent = money(ai, L, 2)
      out('now').textContent = money(now, L)
      out('minutes').textContent = fmt(minutes, L) + ' ' + cfg.t.minutes
      out('new').textContent = money(next, L)
      out('split').textContent = cfg.t.ai + ' ' + money(aiCost, L) + ' + ' + cfg.t.support + ' ' + money(support, L)
      out('save').textContent = save > 0 ? money(save, L) : '—'
      out('payback').textContent = save > 0 ? fmt(plan.price / save, L, 1) + ' ' + cfg.t.months : cfg.t.none
      var newBar = roi.querySelector('[data-bar="new"]')
      var nowBar = roi.querySelector('[data-bar="now"]')
      var pctEl = out('pct')
      if (newBar && nowBar) {
        var maxV = Math.max(1, now, next)
        nowBar.style.width = Math.max(8, Math.round(now / maxV * 100)) + '%'
        newBar.style.width = Math.max(8, Math.round(next / maxV * 100)) + '%'
      }
      if (pctEl) {
        pctEl.textContent = (save > 0 && now > 0) ? '−' + Math.round(save / now * 100) + '%' : '0%'
        pctEl.hidden = !(save > 0 && now > 0)
      }
      var price = money(plan.price, L)
      if (plan.from) price = cfg.t.from.replace('{price}', price)
      out('plan').textContent = plan.name + ' ' + cfg.t.plan + ', ' + price
    }
    roi.addEventListener('input', update)
    roi.addEventListener('change', update)
    roi.addEventListener('submit', function (e) { e.preventDefault() })
    update()
  }

  /* ---------- Müraciət forması ---------- */
  var form = d.querySelector('[data-lead]')
  if (form) {
    var lead = JSON.parse(form.getAttribute('data-lead'))
    var errBox = form.querySelector('[data-msg="error"]')
    var okBox = form.querySelector('[data-msg="ok"]')
    var plan = ''
    try { plan = new URLSearchParams(window.location.search).get('plan') || '' } catch (e) { plan = '' }
    if (plan && !/^[a-z]{2,20}$/.test(plan)) plan = ''
    // ?need=inbound — «Nə lazımdır» sahəsində uyğun seçim (çağrı mərkəzi səhifəsindən gələndə).
    var need = ''
    try { need = new URLSearchParams(window.location.search).get('need') || '' } catch (e) { need = '' }
    if (/^[a-z]{2,20}$/.test(need)) {
      var needOption = form.querySelector('#lead-need option[data-need="' + need + '"]')
      if (needOption) needOption.selected = true
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault()
      var via = (e.submitter && e.submitter.value) || 'wa'
      var nameEl = form.querySelector('#lead-name')
      var phoneEl = form.querySelector('#lead-phone')
      var name = nameEl.value.trim()
      var phone = phoneEl.value.trim()
      okBox.hidden = true
      if (!name || phone.replace(/\D/g, '').length < 7) {
        errBox.textContent = lead.error
        errBox.hidden = false
        ;(!name ? nameEl : phoneEl).focus()
        return
      }
      errBox.hidden = true
      var lines = [lead.intro, '']
      Array.prototype.forEach.call(form.querySelectorAll('[data-label]'), function (f) {
        var v = (f.value || '').trim()
        if (v) lines.push(f.getAttribute('data-label') + ': ' + v)
      })
      if (plan) lines.push(lead.planLabel + ': ' + ((lead.plans && lead.plans[plan]) || plan))
      var text = lines.join('\n')
      if (via === 'mail') {
        window.location.href = 'mailto:' + lead.mail + '?subject=' + encodeURIComponent(lead.subject) + '&body=' + encodeURIComponent(text)
        okBox.textContent = lead.okMail
      } else {
        var url = 'https://wa.me/' + lead.wa + '?text=' + encodeURIComponent(text)
        var win = window.open(url, '_blank')
        if (win) { try { win.opener = null } catch (err) { /* köhnə brauzer */ } } else { window.location.href = url }
        okBox.textContent = lead.okWa
      }
      okBox.hidden = false
    })
  }

  /* ---------- Səhifə sürüşdükcə açılan vizual bloklar ([data-reveal]) ---------- */
  var reveals = d.querySelectorAll('[data-reveal]')
  if (reveals.length) {
    if (!reduced && 'IntersectionObserver' in window) {
      var revObs = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) {
            en.target.classList.add('is-inview')
            revObs.unobserve(en.target)
          }
        })
      }, { threshold: 0.12, rootMargin: '0px 0px -28px 0px' })
      Array.prototype.forEach.call(reveals, function (el) { revObs.observe(el) })
    } else {
      Array.prototype.forEach.call(reveals, function (el) { el.classList.add('is-inview') })
    }
  }

  /* ---------- Canlı zəng kartı simulyasiyası ([data-callcard]) ---------- */
  function pad2(n) { return n < 10 ? '0' + n : String(n) }
  function parseSec(str) {
    var m = /^(\d+):(\d{2})$/.exec(str || '')
    return m ? parseInt(m[1], 10) * 60 + parseInt(m[2], 10) : 72
  }
  function fmtSec(s) { return pad2(Math.floor(s / 60)) + ':' + pad2(s % 60) }

  Array.prototype.forEach.call(d.querySelectorAll('[data-callcard]'), function (card) {
    var msgs = card.querySelectorAll('.msg')
    var res = card.querySelector('.callcard__result')
    var chips = card.querySelectorAll('.callcard__result .chip')
    var timerEl = card.querySelector('[data-call-timer]')
    var replayBtn = card.querySelector('[data-replay]')
    var targetStr = card.getAttribute('data-timer') || (timerEl ? timerEl.textContent : '01:12')
    var targetSec = parseSec(targetStr)
    var timers = []
    var tickId = null

    function clearAll() {
      while (timers.length) clearTimeout(timers.pop())
      if (tickId) { clearInterval(tickId); tickId = null }
    }

    function play() {
      clearAll()
      Array.prototype.forEach.call(msgs, function (m) { m.classList.add('is-queued') })
      if (res) res.classList.add('is-queued')
      Array.prototype.forEach.call(chips, function (c) { c.classList.add('is-queued') })

      var stepMs = 820
      var totalMs = msgs.length * stepMs + 350
      var startAt = Date.now()
      if (timerEl) timerEl.textContent = '00:02'
      card.setAttribute('data-speaking', 'ai')

      tickId = setInterval(function () {
        var p = Math.min(1, (Date.now() - startAt) / totalMs)
        var cur = Math.max(2, Math.round(2 + (targetSec - 2) * p))
        if (timerEl) timerEl.textContent = fmtSec(cur)
      }, 120)

      Array.prototype.forEach.call(msgs, function (m, idx) {
        timers.push(setTimeout(function () {
          m.classList.remove('is-queued')
          card.setAttribute('data-speaking', m.getAttribute('data-who') === 'customer' ? 'cust' : 'ai')
        }, 160 + idx * stepMs))
      })

      timers.push(setTimeout(function () {
        if (tickId) { clearInterval(tickId); tickId = null }
        if (timerEl) timerEl.textContent = targetStr
        card.setAttribute('data-speaking', 'done')
        if (res) res.classList.remove('is-queued')
        Array.prototype.forEach.call(chips, function (c, idx) {
          timers.push(setTimeout(function () { c.classList.remove('is-queued') }, 90 + idx * 110))
        })
      }, totalMs))
    }

    if (replayBtn) {
      replayBtn.addEventListener('click', function () { play() })
    }
    if (!reduced) {
      if ('IntersectionObserver' in window) {
        var cObs = new IntersectionObserver(function (entries) {
          entries.forEach(function (en) {
            if (en.isIntersecting) { play(); cObs.unobserve(card) }
          })
        }, { threshold: 0.2 })
        cObs.observe(card)
      } else {
        play()
      }
    }
  })
})()
