export async function init(sdk) {
  await sdk.whenReady()

  // ── Config ───────────────────────────────────────────────────────────────
  let props = sdk.getProps()

  function applyConfig(p) {
    const w = sdk.$('.w')
    if (w) w.style.setProperty('--accent', p.accent_color || '#2563eb')
    const t = sdk.$('#widget-title')
    if (t) t.textContent = p.widget_title || 'My Cases'
  }

  applyConfig(props)
  sdk.on('propsChanged', (p) => { props = p; applyConfig(p) })
  sdk.on('destroy', () => {})

  // ── Connector calls ───────────────────────────────────────────────────────
  const wsSdk = new window.WidgetServiceSDK()

  async function execConnector(permalink, method, payload = null) {
    const opts = { permalink, method }
    if (payload) opts.payload = payload
    const result = await wsSdk.connectors.execute(opts)
    return result
  }

  const execGet  = (permalink)          => execConnector(permalink, 'GET')
  const execPost = (permalink, payload) => execConnector(permalink, 'POST', payload)

  // ── State ─────────────────────────────────────────────────────────────────
  let topics        = []   // cached from list connector
  let selectedId    = null
  let showingCreate = false

  // ── Element refs ──────────────────────────────────────────────────────────
  const $ = (s) => sdk.$(s)

  const casesLoading   = $('#cases-loading')
  const casesError     = $('#cases-error')
  const casesTableWrap = $('#cases-table-wrap')
  const casesMeta      = $('#cases-meta')
  const casesTbody     = $('#cases-tbody')
  const casesEmpty     = $('#cases-empty')

  const rightPanelHead    = $('#right-panel-head')
  const detailPlaceholder = $('#detail-placeholder')
  const detailLoading     = $('#detail-loading')
  const detailContent     = $('#detail-content')
  const detailRows        = $('#detail-rows')
  const commentsList      = $('#comments-list')
  const commentsEmpty     = $('#comments-empty')
  const replyText         = $('#reply-text')
  const btnPostComment    = $('#btn-post-comment')
  const replyError        = $('#reply-error')

  const createForm      = $('#create-form')
  const createError     = $('#create-error')
  const caseSubject     = $('#case-subject')
  const caseDescription = $('#case-description')
  const casePriority    = $('#case-priority')
  const btnSubmitCase   = $('#btn-submit-case')

  // ── Helpers ───────────────────────────────────────────────────────────────
  function esc(s) {
    return String(s ?? '')
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;')
  }

  function fmtDate(d) {
    if (!d) return '—'
    return new Date(d).toLocaleString()
  }

  function statusBadge(status) {
    const s = (status || 'open').toLowerCase()
    const cls = s === 'closed' ? 'badge-closed'
              : s.includes('progress') ? 'badge-progress'
              : 'badge-new'
    return `<span class="badge ${cls}">${esc(status || 'Open')}</span>`
  }

  function priorityBadge(p) {
    if (!p) return ''
    const cls = { High: 'badge-high', Critical: 'badge-critical', Medium: 'badge-medium', Low: 'badge-low' }[p] || 'badge-low'
    return `<span class="badge ${cls}">${esc(p)}</span>`
  }

  // Priority is embedded in the topic message as "<em>Priority: Medium</em>"
  function parsePriority(html) {
    const m = (html || '').match(/Priority:\s*(\w+)/i)
    return m ? m[1] : null
  }

  function showErr(el, msg) { el.textContent = msg; el.classList.remove('hidden') }
  function hideErr(el) { el.classList.add('hidden') }

  // ── Right panel modes ─────────────────────────────────────────────────────
  function showRightPlaceholder() {
    rightPanelHead.textContent = 'Details'
    detailPlaceholder.classList.remove('hidden')
    detailLoading.classList.add('hidden')
    detailContent.classList.add('hidden')
    createForm.classList.add('hidden')
    showingCreate = false
  }

  function showRightLoading() {
    rightPanelHead.textContent = 'Details'
    detailPlaceholder.classList.add('hidden')
    detailLoading.classList.remove('hidden')
    detailContent.classList.add('hidden')
    createForm.classList.add('hidden')
  }

  function showRightCreate() {
    rightPanelHead.textContent = 'New Case'
    detailPlaceholder.classList.add('hidden')
    detailLoading.classList.add('hidden')
    detailContent.classList.add('hidden')
    createForm.classList.remove('hidden')
    hideErr(createError)
    caseSubject.value     = ''
    caseDescription.value = ''
    casePriority.value    = 'Medium'
    showingCreate = true
  }

  function renderDetail(topic) {
    rightPanelHead.textContent = 'Details'
    detailPlaceholder.classList.add('hidden')
    detailLoading.classList.add('hidden')
    detailContent.classList.remove('hidden')
    createForm.classList.add('hidden')
    showingCreate = false

    const firstMsg  = topic.firstMessage?.message ?? topic.message ?? ''
    const priority  = parsePriority(firstMsg)
    const replyN    = topic.messagesCount ?? topic.commentCount ?? 0

    detailRows.innerHTML = `
      <div class="detail-row"><span class="detail-label">Case #</span>    <span class="detail-value">${esc(topic.id)}</span></div>
      <div class="detail-row"><span class="detail-label">Subject</span>   <span class="detail-value">${esc(topic.title)}</span></div>
      <div class="detail-row"><span class="detail-label">Status</span>    <span class="detail-value">${statusBadge(topic.status || 'open')}</span></div>
      ${priority ? `<div class="detail-row"><span class="detail-label">Priority</span>  <span class="detail-value">${priorityBadge(priority)}</span></div>` : ''}
      <div class="detail-row"><span class="detail-label">Created</span>   <span class="detail-value">${fmtDate(topic.createdAt)}</span></div>
      <div class="detail-row"><span class="detail-label">Last Modified By</span><span class="detail-value">${esc(topic.user?.username ?? topic.user?.displayName ?? '—')}</span></div>
      ${firstMsg ? `<div class="detail-row"><span class="detail-label">Description</span><span class="detail-value">${firstMsg}</span></div>` : ''}
    `

    // Comments (replies from mods or the thread messages)
    const messages = topic.messages?.data ?? topic.messages ?? []
    if (!messages.length) {
      commentsEmpty.classList.remove('hidden')
      commentsList.innerHTML = ''
    } else {
      commentsEmpty.classList.add('hidden')
      commentsList.innerHTML = messages.map(m => {
        const author = m.user?.username ?? m.user?.displayName ?? 'Support'
        const body   = m.message ?? m.body ?? ''
        return `
          <div class="comment">
            <div class="comment-meta">
              <span class="comment-author">${esc(author)}</span>
              <span class="comment-time">${fmtDate(m.createdAt)}</span>
            </div>
            <div class="comment-body">${body}</div>
          </div>`
      }).join('')
    }

    replyText.value = ''
    hideErr(replyError)
    commentsList.scrollTop = commentsList.scrollHeight
  }

  // ── Load case list ────────────────────────────────────────────────────────
  async function loadCases() {
    casesLoading.classList.remove('hidden')
    casesTableWrap.classList.add('hidden')
    casesEmpty.classList.add('hidden')
    casesMeta.classList.add('hidden')
    hideErr(casesError)

    try {
      const res = await execGet('community-cases-list', {})
      topics = res?.result ?? []

      casesLoading.classList.add('hidden')

      if (!topics.length) {
        casesEmpty.classList.remove('hidden')
        return
      }

      casesMeta.textContent = `${topics.length} case(s) loaded.`
      casesMeta.classList.remove('hidden')

      casesTbody.innerHTML = topics.map(t => `
        <tr data-id="${esc(t.id)}" ${selectedId == t.id ? 'class="selected"' : ''}>
          <td>${esc(t.id)}</td>
          <td class="subj-cell" title="${esc(t.title)}">${esc(t.title)}</td>
          <td>${statusBadge(t.status || 'open')}</td>
          <td style="white-space:nowrap;color:#6b7280;">${fmtDate(t.createdAt)}</td>
        </tr>`).join('')

      casesTableWrap.classList.remove('hidden')

      casesTbody.querySelectorAll('tr').forEach(row =>
        row.addEventListener('click', () => selectTopic(row.dataset.id))
      )

      // Re-select using refreshed cache
      if (selectedId) selectTopic(selectedId)

    } catch (err) {
      casesLoading.classList.add('hidden')
      showErr(casesError, err.message)
    }
  }

  // ── Select a topic → render from cache ───────────────────────────────────
  function selectTopic(id) {
    selectedId    = id
    showingCreate = false

    casesTbody.querySelectorAll('tr').forEach(r =>
      r.classList.toggle('selected', r.dataset.id == id)
    )

    const topic = topics.find(t => String(t.id) === String(id))
    if (topic) {
      renderDetail(topic)
    } else {
      showRightPlaceholder()
    }
  }

  // ── Create case ───────────────────────────────────────────────────────────
  async function createCase() {
    const subject     = caseSubject.value.trim()
    const description = caseDescription.value.trim()
    const priority    = casePriority.value

    if (!subject)     { caseSubject.focus();     return }
    if (!description) { caseDescription.focus(); return }

    hideErr(createError)
    btnSubmitCase.disabled    = true
    btnSubmitCase.textContent = 'Submitting…'

    try {
      const categoryId = Number(props.category_id)
      if (!categoryId) throw new Error('Category ID not configured in widget settings.')

      await execPost('community-cases-create', {
        title:      subject,
        content:    `<p>${esc(description)}</p><p><em>Priority: ${esc(priority)}</em></p>`,
        categoryId
      })

      showRightPlaceholder()
      await loadCases()

    } catch (err) {
      showErr(createError, err.message)
    } finally {
      btnSubmitCase.disabled    = false
      btnSubmitCase.textContent = 'Submit Case'
    }
  }

  // ── Post comment ──────────────────────────────────────────────────────────
  async function postComment() {
    const message = replyText.value.trim()
    if (!message || !selectedId) return

    hideErr(replyError)
    btnPostComment.disabled    = true
    btnPostComment.textContent = 'Posting…'

    try {
      await execPost(
        'community-cases-add-reply',
        { topicId: selectedId, content: `<p>${esc(message)}</p>` }
      )
      await loadCases()  // refreshes cache including new message, then re-selects
    } catch (err) {
      showErr(replyError, err.message)
    } finally {
      btnPostComment.disabled    = false
      btnPostComment.textContent = 'Post Comment'
    }
  }

  // ── Bindings ──────────────────────────────────────────────────────────────
  $('#btn-new-case').addEventListener('click', () => {
    casesTbody.querySelectorAll('tr').forEach(r => r.classList.remove('selected'))
    selectedId = null
    showRightCreate()
  })
  $('#btn-refresh').addEventListener('click', loadCases)
  $('#btn-submit-case').addEventListener('click', createCase)
  $('#btn-cancel-create').addEventListener('click', () => {
    showRightPlaceholder()
    showingCreate = false
  })
  btnPostComment.addEventListener('click', postComment)
  replyText.addEventListener('keydown', e => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) postComment()
  })

  // ── Boot ──────────────────────────────────────────────────────────────────
  showRightPlaceholder()
  await loadCases()
}
