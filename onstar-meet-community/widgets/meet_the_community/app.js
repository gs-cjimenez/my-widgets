export async function init(sdk) {
  await sdk.whenReady()

  const track = sdk.$('#carouselTrack')
  const pagination = sdk.$('#pagination')
  const prevBtn = sdk.$('#prevBtn')
  const nextBtn = sdk.$('#nextBtn')

  let currentSlide = 0
  let members = []
  let cardsPerSlide = 2

  function buildSlides(data) {
    track.innerHTML = ''
    pagination.innerHTML = ''

    const slides = []
    for (let i = 0; i < data.length; i += cardsPerSlide) {
      slides.push(data.slice(i, i + cardsPerSlide))
    }

    slides.forEach((group, idx) => {
      const slide = document.createElement('div')
      slide.className = 'slide'

      group.forEach(member => {
        slide.appendChild(buildCard(member))
      })

      track.appendChild(slide)

      const dot = document.createElement('button')
      dot.className = 'dot' + (idx === currentSlide ? ' active' : '')
      dot.setAttribute('aria-label', `Slide ${idx + 1}`)
      dot.addEventListener('click', () => goTo(idx))
      pagination.appendChild(dot)
    })

    updateNav(slides.length)
  }

  function buildCard(member) {
    const card = document.createElement('div')
    card.className = 'member-card'
    card.style.setProperty('--card-accent', member.accentColor || '#2563eb')

    const accentBar = document.createElement('div')
    accentBar.className = 'accent-bar'
    accentBar.style.background = member.accentColor || '#2563eb'

    const avatarCol = document.createElement('div')
    avatarCol.className = 'avatar-col'

    if (member.photoUrl) {
      const img = document.createElement('img')
      img.src = member.photoUrl
      img.alt = member.name
      img.onerror = () => avatarCol.replaceChild(makeInitials(member), img)
      avatarCol.appendChild(img)
    } else {
      avatarCol.appendChild(makeInitials(member))
    }

    const body = document.createElement('div')
    body.className = 'card-body'
    body.innerHTML = `
      <div class="member-name">${esc(member.name)}</div>
      <div class="member-title">${esc(member.jobTitle)}</div>
      ${member.handle ? `<div class="member-handle"><a href="https://community.onstar.com/t5/user/viewprofilepage/user-id/${esc(member.handle)}" target="_blank">@${esc(member.handle)}</a></div>` : ''}
      ${member.location ? `<div class="member-location"><span>${member.locationFlag || '📍'}</span> ${esc(member.location)}</div>` : ''}
      <hr class="divider">
      ${member.products ? `<div class="card-section-label">Products</div><div class="card-section-value">${esc(member.products)}</div>` : ''}
      ${member.askMeAbout ? `<div class="card-section-label">Ask me about</div><div class="card-section-value">${esc(member.askMeAbout)}</div>` : ''}
    `

    card.appendChild(accentBar)
    card.appendChild(avatarCol)
    card.appendChild(body)
    return card
  }

  function makeInitials(member) {
    const el = document.createElement('div')
    el.className = 'avatar-placeholder'
    el.textContent = (member.name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    return el
  }

  function esc(str) {
    return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  }

  function goTo(idx) {
    const slides = track.querySelectorAll('.slide')
    if (idx < 0 || idx >= slides.length) return
    currentSlide = idx
    track.style.transform = `translateX(-${idx * 100}%)`
    pagination.querySelectorAll('.dot').forEach((d, i) => d.classList.toggle('active', i === idx))
    updateNav(slides.length)
  }

  function updateNav(total) {
    if (prevBtn) prevBtn.disabled = currentSlide === 0
    if (nextBtn) nextBtn.disabled = currentSlide >= total - 1
  }

  prevBtn && prevBtn.addEventListener('click', () => goTo(currentSlide - 1))
  nextBtn && nextBtn.addEventListener('click', () => goTo(currentSlide + 1))

  function applyProps(props) {
    members = parseMembers(props)
    buildSlides(members)
    goTo(0)

    const title = sdk.$('.section-title')
    if (title) title.textContent = props.sectionTitle || 'Meet the community'
  }

  function parseMembers(props) {
    const list = []
    const accents = ['#00a651', '#f5c518', '#0077b6', '#e63946', '#7b2d8b']

    for (let i = 1; i <= 6; i++) {
      const name = props[`member${i}_name`]
      if (!name) continue
      list.push({
        name,
        jobTitle:    props[`member${i}_title`]      || '',
        handle:      props[`member${i}_handle`]     || '',
        location:    props[`member${i}_location`]   || '',
        locationFlag:props[`member${i}_flag`]       || '📍',
        products:    props[`member${i}_products`]   || '',
        askMeAbout:  props[`member${i}_askme`]      || '',
        photoUrl:    props[`member${i}_photo`]      || '',
        accentColor: props[`member${i}_color`]      || accents[(i - 1) % accents.length],
      })
    }
    return list
  }

  applyProps(sdk.getProps())

  sdk.on('propsChanged', (newProps) => applyProps(newProps))
  sdk.on('destroy', () => {})
}
