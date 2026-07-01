export async function init(sdk) {
  await sdk.whenReady()

  const banner = sdk.$('.banner')
  const accentBar = sdk.$('.accent-bar')
  const eyebrowDot = sdk.$('.eyebrow-dot')
  const eyebrowText = sdk.$('.eyebrow-text')
  const titleEl = sdk.$('.title')
  const ctaBtn = sdk.$('.cta-btn')
  const ctaLabel = sdk.$('.cta-label')
  const iconWrap = sdk.$('.icon-wrap')

  function applyProps(props) {
    if (banner) banner.style.background = props.banner_bg_color || '#f0f4f8'

    const accentColor = props.accent_color || '#2563eb'
    if (accentBar) accentBar.style.background = accentColor
    if (eyebrowDot) eyebrowDot.style.background = accentColor
    if (eyebrowText) {
      eyebrowText.textContent = props.eyebrow_text || 'New Learning Path'
      eyebrowText.style.color = accentColor
    }

    if (titleEl) titleEl.style.color = props.title_color || '#111827'
    if (titleEl) titleEl.textContent = props.title || 'Analytics Fundamentals'

    if (ctaBtn) {
      ctaBtn.style.background = props.button_bg_color || '#1e293b'
      ctaBtn.style.color = props.button_text_color || '#ffffff'
      ctaBtn.href = props.button_url || '#'
    }
    if (ctaLabel) ctaLabel.textContent = props.button_text || 'Start Learning'

    if (iconWrap) {
      const iconUrl = props.icon_url || ''
      if (iconUrl) {
        iconWrap.innerHTML = `<img src="${iconUrl}" alt="" />`
      } else {
        iconWrap.style.background = props.icon_bg_color || '#1e293b'
      }
    }
  }

  applyProps(sdk.getProps())

  sdk.on('propsChanged', (newProps) => applyProps(newProps))
  sdk.on('destroy', () => {})
}
