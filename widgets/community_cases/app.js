export async function init(sdk) {
  await sdk.whenReady()

  // ── Config ──────────────────────────────────────────────────────────────
  let props = sdk.getProps()

  function applyConfig(p) {
    const accent = p.accent_color || '#2563eb'
    const widget = sdk.$('.widget')
    if (widget) widget.style.setProperty('--accent', accent)
    const titleEl = sdk.$('#widget-title-el')
    if (titleEl) titleEl.textContent = p.widget_title || 'My Cases'
  }

  applyConfig(props)
  sdk.on('propsChanged', (p) => { props = p; applyConfig(p) })
  sdk.on('destroy', () => {})

  // ── State ────────────────────────────────────────────────────────────────
  let currentTopicId   = null
  let currentTopicTitle = ''
  let currentTopics    = []  // cache from list call

  // ── Element refs ─────────────────────────────────────────────────────────
  const $ = (sel) => sdk.$(sel)

  const viewList    = $('#view-list')
  const viewCreate  = $('#view-create')
  const viewDetail  = $('#view-detail')

  const listLoading = $('#list-loading')
  const listError   = $('#list-error')
  const casesList   = $('#cases-list')
  const listEmpty   = $('#list-empty')

  const createError     = $('#create-error')
  const caseSubject     = $('#case-subject')
  const caseDescription = $('#case-description')
  const casePriority    = $('#case-priority')
  const btnSubmitCase   = $('#btn-submit-case')

  const detailStatusBadge = $('#detail-status-badge')
  const detailTitleEl     = $('#detail-title-el')
  const threadLoading     = $('#thread-loading')
  const threadError       = $('#thread-error')
  const threadEl          = $('#thread')
  const replyText         = $('#reply-text')
  const btnSendReply      = $('#btn-send-reply')

  // ── View switching ───────────────────────────────────────────────────────
  function showView(name) {
    viewList.style.display   = name === 'list'   ? 'block' : 'none'
    viewCreate.style.display = name === 'create' ? 'block' : 'none'
    viewDetail.style.display = name === 'detail' ? 'block' : 'none'
  }

  // ── UI helpers ────────────────────────────────────────────────────────────
  function showError(el, msg) { el.textContent = msg; el.classList.remove('hidden') }
  function hideError(el) { el.classList.add('hidden') }

  function badgeClass(status) {
    const s = (status || 'open').toLowerCase()
    return s === 'closed' ? 'badge-closed' : s.includes('progress') ? 'badge-in-progress' : 'badge-open'
  }

  function timeAgo(dateStr) {
    if (!dateStr) return ''
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
    if (diff < 60)    return 'just now'
    if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return `${Math.floor(diff / 86400)}d ago`
  }

  function esc(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
  }

  function avatarHtml(user, isUser) {
    const name = user?.username || user?.displayName || user?.name || '?'
    const initial = name.charAt(0).toUpperCase()
    const imgUrl  = user?.avatar?.data?.url || user?.avatarUrl || ''
    return imgUrl
      ? `<div class="avatar ${isUser ? 'is-user' : ''}"><img src="${esc(imgUrl)}" alt="${initial}" /></div>`
      : `<div class="avatar">${initial}</div>`
  }

  // ── Connector calls ──────────────────────────────────────────────────────
  // sdk.callConnector(permalink, { body }) sends the body as JSON to the
  // connector proxy, which evaluates the Jinja template and calls the CC API.
  async function call(permalink, body = {}) {
    return sdk.callConnector(permalink, { body: JSON.stringify(body) })
  }

  // ── Load case list ───────────────────────────────────────────────────────
  async function loadCases() {
    listLoading.classList.remove('hidden')
    casesList.classList.add('hidden')
    listEmpty.classList.add('hidden')
    hideError(listError)

    try {
      const categoryId = props.category_id
      if (!categoryId) throw new Error('No Category ID configured — ask your admin to set it in widget settings.')

      const res = await call('community-cases-list', { categoryId: Number(categoryId) })

      // CC API returns { data: [ topic, ... ] }
      const topics = res?.data ?? res?.items ?? []
      currentTopics = topics

      listLoading.classList.add('hidden')

      if (!topics.length) {
        listEmpty.classList.remove('hidden')
        return
      }

      casesList.innerHTML = topics.map(t => {
        const status   = (t.status || 'open').toLowerCase()
        const replyN   = t.messagesCount ?? t.commentCount ?? 0
        const updated  = t.updatedAt || t.createdAt
        return `
          <div class="case-item" data-id="${esc(t.id)}" data-title="${esc(t.title)}">
            <div class="case-info">
              <div class="case-subject">${esc(t.title)}</div>
              <div class="case-meta">${timeAgo(updated)} · ${replyN} ${replyN === 1 ? 'reply' : 'replies'}</div>
            </div>
            <span class="badge ${badgeClass(status)}">${status}</span>
            <span class="case-chevron">›</span>
          </div>`
      }).join('')

      casesList.classList.remove('hidden')

      casesList.querySelectorAll('.case-item').forEach(el => {
        el.addEventListener('click', () => openCase(el.dataset.id, el.dataset.title))
      })

    } catch (err) {
      listLoading.classList.add('hidden')
      showError(listError, err?.message || 'Failed to load cases. Please try again.')
    }
  }

  // ── Open case thread ─────────────────────────────────────────────────────
  async function openCase(topicId, topicTitle) {
    currentTopicId    = topicId
    currentTopicTitle = topicTitle

    detailTitleEl.textContent   = topicTitle
    detailStatusBadge.className = 'badge'
    detailStatusBadge.textContent = ''
    threadLoading.classList.remove('hidden')
    threadEl.classList.add('hidden')
    hideError(threadError)
    replyText.value = ''

    showView('detail')

    try {
      const res   = await call('community-cases-get-thread', { topicId: Number(topicId) })
      const topic = res?.data ?? res

      // Update status badge
      const status = (topic.status || 'open').toLowerCase()
      detailStatusBadge.className   = `badge ${badgeClass(status)}`
      detailStatusBadge.textContent = status

      // Build message thread: original post + replies
      const replies   = topic.messages?.data ?? topic.comments ?? []
      const opMessage = topic.firstMessage?.message ?? topic.message ?? topic.body ?? ''

      const allMessages = [
        { id: 'op', user: topic.user ?? topic.author, body: opMessage, createdAt: topic.createdAt, isUser: true },
        ...replies.map(m => ({
          id:        m.id,
          user:      m.user ?? m.author,
          body:      m.message ?? m.body ?? '',
          createdAt: m.createdAt,
          // replies from mods are not the original poster
          isUser:    false
        }))
      ]

      threadEl.innerHTML = allMessages.map(msg => {
        const isUser = msg.isUser
        const name   = msg.user?.username ?? msg.user?.displayName ?? 'User'
        return `
          <div class="message ${isUser ? 'is-user' : 'is-mod'}">
            ${avatarHtml(msg.user, isUser)}
            <div class="bubble">
              <div class="bubble-meta">
                <span class="bubble-author">${esc(name)}</span>
                <span class="bubble-time">${timeAgo(msg.createdAt)}</span>
              </div>
              <div class="bubble-body">${msg.body}</div>
            </div>
          </div>`
      }).join('')

      threadLoading.classList.add('hidden')
      threadEl.classList.remove('hidden')
      threadEl.scrollTop = threadEl.scrollHeight

    } catch (err) {
      threadLoading.classList.add('hidden')
      showError(threadError, err?.message || 'Failed to load case thread. Please try again.')
    }
  }

  // ── Create case ──────────────────────────────────────────────────────────
  async function createCase() {
    const subject     = caseSubject.value.trim()
    const description = caseDescription.value.trim()
    const priority    = casePriority.value

    if (!subject)     { caseSubject.focus();     return }
    if (!description) { caseDescription.focus(); return }

    hideError(createError)
    btnSubmitCase.disabled    = true
    btnSubmitCase.textContent = 'Submitting…'

    try {
      const categoryId = props.category_id
      if (!categoryId) throw new Error('Category not configured. Ask your admin to set it in widget settings.')

      await call('community-cases-create', {
        title:      subject,
        // Embed priority in the message body so moderators see it
        message:    `<p>${esc(description)}</p><p><em>Priority: ${esc(priority)}</em></p>`,
        categoryId: Number(categoryId),
        type:       'question'
      })

      // Reset and return to list
      caseSubject.value     = ''
      caseDescription.value = ''
      casePriority.value    = 'Medium'
      showView('list')
      await loadCases()

    } catch (err) {
      showError(createError, err?.message || 'Failed to create case. Please try again.')
    } finally {
      btnSubmitCase.disabled    = false
      btnSubmitCase.textContent = 'Submit Case'
    }
  }

  // ── Send reply ───────────────────────────────────────────────────────────
  async function sendReply() {
    const message = replyText.value.trim()
    if (!message || !currentTopicId) return

    hideError(threadError)
    btnSendReply.disabled    = true
    btnSendReply.textContent = '…'

    try {
      await call('community-cases-add-reply', {
        message: `<p>${esc(message)}</p>`,
        topicId: Number(currentTopicId)
      })
      replyText.value = ''
      // Reload thread to show the new comment
      await openCase(currentTopicId, currentTopicTitle)
    } catch (err) {
      showError(threadError, err?.message || 'Failed to send reply. Please try again.')
    } finally {
      btnSendReply.disabled    = false
      btnSendReply.textContent = 'Send'
    }
  }

  // ── Event bindings ───────────────────────────────────────────────────────
  $('#btn-new-case').addEventListener('click', () => {
    hideError(createError)
    showView('create')
  })
  $('#btn-back-create').addEventListener('click', () => showView('list'))
  $('#btn-cancel-create').addEventListener('click', () => showView('list'))
  $('#btn-back-detail').addEventListener('click', () => showView('list'))
  btnSubmitCase.addEventListener('click', createCase)
  btnSendReply.addEventListener('click', sendReply)

  replyText.addEventListener('keydown', e => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) sendReply()
  })

  // ── Boot ─────────────────────────────────────────────────────────────────
  showView('list')
  await loadCases()
}
