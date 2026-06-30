export async function init(sdk) {
  await sdk.whenReady()

  const badgeDot = sdk.$('#badgeDot')
  const badgeText = sdk.$('#badgeText')
  const courseTitle = sdk.$('#courseTitle')
  const ctaBtn = sdk.$('#ctaBtn')
  const ctaText = sdk.$('#ctaText')
  const logoImg = sdk.$('#logoImg')
  const logoFallback = sdk.$('#logoFallback')
  const banner = sdk.$('.banner')

  function apply(props) {
    const accent = props.accent_color || '#1B3B6F'
    const btnBg = props.button_bg_color || '#1B3B6F'

    banner.style.setProperty('--accent', accent)
    banner.style.setProperty('--btn-bg', btnBg)

    if (badgeDot) badgeDot.style.background = accent
    if (badgeText) {
      badgeText.textContent = props.badge_label || 'NEW LEARNING PATH'
      badgeText.style.color = accent
    }
    if (courseTitle) courseTitle.textContent = props.course_title || 'Analytics Fundamentals'
    if (ctaText) ctaText.textContent = props.button_text || 'Start Learning'
    if (ctaBtn) ctaBtn.href = props.button_url || '#'

    if (props.logo_url) {
      logoImg.src = props.logo_url
      logoImg.style.display = 'block'
      logoFallback.style.display = 'none'
      logoImg.onerror = () => {
        logoImg.style.display = 'none'
        logoFallback.style.display = 'flex'
      }
    } else {
      logoImg.style.display = 'none'
      logoFallback.style.display = 'flex'
    }
  }

  apply(sdk.getProps())
  sdk.on('propsChanged', apply)
}
