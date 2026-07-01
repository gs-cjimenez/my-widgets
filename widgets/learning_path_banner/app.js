export async function init(sdk) {
  await sdk.whenReady()

  const banner = sdk.$('#banner')
  const logoWrap = sdk.$('#logoWrap')
  const logoFallback = sdk.$('#logoFallback')
  const eyebrowText = sdk.$('#eyebrowText')
  const titleText = sdk.$('#titleText')
  const ctaText = sdk.$('#ctaText')

  function applyProps(props) {
    if (banner) banner.href = props.url || '#'
    if (eyebrowText) eyebrowText.textContent = props.eyebrow || 'New Learning Path'
    if (titleText) titleText.textContent = props.title || 'Databricks Analytics Fundamentals Accreditation'
    if (ctaText) ctaText.textContent = props.cta_label || 'Explore Flows'

    if (logoWrap) {
      logoWrap.style.background = props.accent_color || '#1b3a6b'
    }

    if (props.logo_url && logoWrap) {
      const existing = logoWrap.querySelector('img')
      if (!existing) {
        const img = document.createElement('img')
        img.alt = ''
        logoWrap.innerHTML = ''
        logoWrap.appendChild(img)
      }
      logoWrap.querySelector('img').src = props.logo_url
      if (logoFallback) logoFallback.style.display = 'none'
    }
  }

  applyProps(sdk.getProps())
  sdk.on('propsChanged', applyProps)
  sdk.on('destroy', () => {})
}
