export async function init(sdk) {
  await sdk.whenReady()

  const root = sdk.getContainer()
  const banner = sdk.$('#banner')
  const logoWrap = sdk.$('#logoWrap')
  const eyebrowText = sdk.$('#eyebrowText')
  const titleText = sdk.$('#titleText')
  const ctaText = sdk.$('#ctaText')

  function applyProps(props) {
    if (banner) banner.href = props.url || '#'
    if (eyebrowText) eyebrowText.textContent = props.eyebrow || 'New Learning Path'
    if (titleText) titleText.textContent = props.title || 'Databricks Analytics Fundamentals Accreditation'
    if (ctaText) ctaText.textContent = props.cta_label || 'Explore Flows'

    root.style.setProperty('--lp-banner-bg', props.banner_bg_color || '#f0f4fa')
    root.style.setProperty('--lp-accent', props.accent_color || '#1b3a6b')
    root.style.setProperty('--lp-eyebrow', props.eyebrow_color || '#e85d26')
    root.style.setProperty('--lp-title', props.title_color || '#111827')
    root.style.setProperty('--lp-cta-bg', props.cta_color || '#1b3a6b')
    root.style.setProperty('--lp-cta-text', props.cta_text_color || '#ffffff')
    root.style.setProperty('--lp-logo-text', props.logo_text_color || '#ffffff')

    if (props.logo_url && logoWrap) {
      let img = logoWrap.querySelector('img')
      if (!img) {
        img = document.createElement('img')
        img.alt = ''
        logoWrap.innerHTML = ''
        logoWrap.appendChild(img)
      }
      img.src = props.logo_url
    }
  }

  applyProps(sdk.getProps())
  sdk.on('propsChanged', applyProps)
  sdk.on('destroy', () => {})
}
