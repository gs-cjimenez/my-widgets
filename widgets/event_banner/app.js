export async function init(sdk) {
  await sdk.whenReady()

  const banner = sdk.$('#banner')
  const badge = sdk.$('#badge')
  const title = sdk.$('#title')
  const description = sdk.$('#description')
  const cta = sdk.$('#cta')
  const imageWrap = sdk.$('#image-wrap')
  const image = sdk.$('#image')

  function applyProps(props) {
    if (title) title.textContent = props.title || 'Ask Microsoft Anything: The Microsoft Sentinel SIEM Migration Experience on June 23'
    if (description) description.textContent = props.description || 'Join us for a live demo and AMA on the Microsoft Sentinel SIEM migration experience.'
    if (cta) {
      cta.textContent = props.buttonText || 'RSVP Here'
      cta.href = props.buttonUrl || 'https://techcommunity.microsoft.com/event/microsoft-security-events/ask-microsoft-anything-the-microsoft-sentinel-siem-migration-experience/4521635'
    }
    if (banner) {
      banner.style.setProperty('--banner-bg', props.backgroundColor || '#0078D4')
      banner.style.backgroundColor = props.backgroundColor || '#0078D4'
    }
    if (badge) {
      badge.textContent = props.badgeText || '#Event'
      badge.style.display = props.badgeText === '' ? 'none' : ''
    }
    if (image && imageWrap) {
      if (props.imageUrl) {
        image.src = props.imageUrl
        imageWrap.classList.remove('hidden')
      } else {
        imageWrap.classList.add('hidden')
      }
    }
  }

  applyProps(sdk.getProps())

  sdk.on('propsChanged', (newProps) => applyProps(newProps))
  sdk.on('destroy', () => {})
}
