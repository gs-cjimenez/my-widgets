export async function init(sdk) {
  await sdk.whenReady()

  const label = sdk.$('#banner-label')
  const title = sdk.$('#banner-title')
  const ctaBtn = sdk.$('#cta-btn')
  const ctaText = sdk.$('#cta-text')

  function applyProps(props) {
    if (label) label.textContent = props.label || 'NEW ACCREDITATION'
    if (title) title.textContent = props.title || 'Analytics Fundamentals'
    if (ctaText) ctaText.textContent = props.button_text || 'Start Learning'
    if (ctaBtn) {
      ctaBtn.href = props.button_url || 'https://www.databricks.com/resources/learn/training/analytics-fundamentals-accreditation'
    }
  }

  applyProps(sdk.getProps())

  sdk.on('propsChanged', (newProps) => applyProps(newProps))

  sdk.on('destroy', () => {})
}
