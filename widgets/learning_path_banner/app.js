export async function init(sdk) {
  await sdk.whenReady()

  const banner = sdk.$('.lp-banner')
  const iconImg = sdk.$('.lp-icon-img')
  const iconWrap = sdk.$('.lp-icon-wrap')
  const badgeDot = sdk.$('.lp-badge-dot')
  const badgeText = sdk.$('.lp-badge-text')
  const title = sdk.$('.lp-title')
  const cta = sdk.$('.lp-cta')
  const ctaLabel = sdk.$('.lp-cta-label')

  function applyProps(props) {
    const accentColor = props.accentColor || '#FF3621'

    banner.style.setProperty('--accent-color', accentColor)
    badgeDot.style.background = accentColor

    badgeText.textContent = props.badgeLabel || 'NEW LEARNING PATH'
    title.textContent = props.courseTitle || 'Analytics Fundamentals Accreditation'
    ctaLabel.textContent = props.buttonText || 'Explore Now'
    cta.href = props.buttonUrl || '#'

    const iconUrl = props.iconUrl || ''
    if (iconUrl) {
      iconImg.src = iconUrl
      iconImg.style.display = 'block'
      const fallback = sdk.$('.lp-icon-fallback')
      if (fallback) fallback.style.display = 'none'
    } else {
      iconImg.style.display = 'none'
      let fallback = sdk.$('.lp-icon-fallback')
      if (!fallback) {
        fallback = document.createElement('div')
        fallback.className = 'lp-icon-fallback'
        iconWrap.appendChild(fallback)
      }
      fallback.textContent = (props.courseTitle || 'A').charAt(0).toUpperCase()
      fallback.style.display = 'flex'
    }
  }

  applyProps(sdk.getProps())

  sdk.on('propsChanged', (newProps) => applyProps(newProps))
  sdk.on('destroy', () => {})
}
