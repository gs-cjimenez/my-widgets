export async function init(sdk) {
  await sdk.whenReady()

  let current = 0
  let timer = null

  function esc(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
  }

  function buildSlides(props) {
    const count = Math.min(Math.max(parseInt(props.slide_count) || 1, 1), 5)
    const slides = []
    for (let i = 1; i <= count; i++) {
      const title = (props[`s${i}_title`] || '').trim()
      if (!title) continue
      slides.push({
        imageUrl: (props[`s${i}_image_url`] || '').trim(),
        title,
        description: (props[`s${i}_description`] || '').trim(),
        buttonText: (props[`s${i}_button_text`] || 'View More').trim(),
        buttonUrl: (props[`s${i}_button_url`] || '#').trim(),
      })
    }
    return slides
  }

  function renderSlides(slides) {
    const track = sdk.$('#slide-track')
    track.innerHTML = slides.map((s, i) => `
      <div class="slide${i === current ? ' active' : ''}">
        ${s.imageUrl ? `<div class="slide-image-wrap"><img src="${esc(s.imageUrl)}" alt="${esc(s.title)}"></div>` : ''}
        <div class="slide-content">
          <div class="slide-title">${esc(s.title)}</div>
          ${s.description ? `<div class="slide-description">${esc(s.description)}</div>` : ''}
          <a class="slide-btn" href="${esc(s.buttonUrl)}">${esc(s.buttonText)}</a>
        </div>
      </div>
    `).join('')
  }

  function renderDots(slides) {
    const dotsEl = sdk.$('#dots')
    dotsEl.innerHTML = slides.map((_, i) => `
      <button class="dot${i === current ? ' active' : ''}" data-idx="${i}" aria-label="Go to slide ${i + 1}"></button>
    `).join('')
    dotsEl.querySelectorAll('.dot').forEach(dot => {
      dot.addEventListener('click', () => navigate(parseInt(dot.dataset.idx)))
    })
  }

  function updateActive() {
    sdk.$$('.slide').forEach((el, i) => el.classList.toggle('active', i === current))
    sdk.$$('.dot').forEach((el, i) => el.classList.toggle('active', i === current))
  }

  function navigate(idx) {
    current = idx
    updateActive()
  }

  function startAutoplay(slides, intervalSecs) {
    clearInterval(timer)
    const ms = Math.max(parseInt(intervalSecs) || 5, 1) * 1000
    timer = setInterval(() => navigate((current + 1) % slides.length), ms)
  }

  function fullRender(props) {
    const slides = buildSlides(props)
    if (!slides.length) return
    current = Math.min(current, slides.length - 1)
    renderSlides(slides)
    renderDots(slides)
    startAutoplay(slides, props.autoplay_interval)
  }

  let props = sdk.getProps()
  fullRender(props)

  sdk.$('.prev-btn').addEventListener('click', () => {
    const slides = buildSlides(sdk.getProps())
    navigate((current - 1 + slides.length) % slides.length)
  })

  sdk.$('.next-btn').addEventListener('click', () => {
    const slides = buildSlides(sdk.getProps())
    navigate((current + 1) % slides.length)
  })

  sdk.on('propsChanged', (newProps) => {
    current = 0
    fullRender(newProps)
  })

  sdk.on('destroy', () => clearInterval(timer))
}
