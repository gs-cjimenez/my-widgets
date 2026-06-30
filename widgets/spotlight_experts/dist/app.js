export async function init(sdk) {
  await sdk.whenReady();

  var props = sdk.getProps();
  var sectionTitle = props.sectionTitle || 'Statistical Analysis Experts';
  var sectionSubtitle = props.sectionSubtitle || 'Meet the community members recognized for their expertise in statistical analysis. These individuals have demonstrated exceptional knowledge and a commitment to helping others master the art of data-driven discovery.';

  var titleEl = sdk.$('.se-header__title');
  var subtitleEl = sdk.$('.se-header__subtitle');
  var contentEl = sdk.$('#se-content');

  if (titleEl) titleEl.textContent = sectionTitle;
  if (subtitleEl) subtitleEl.textContent = sectionSubtitle;

  var connectorSdk = new window.WidgetServiceSDK();
  connectorSdk.connectors.execute({ permalink: 'spotlight-users', method: 'GET' })
    .then(function(data) {
      console.log('[SpotlightExperts] raw response', data);
      var all;
      if (Array.isArray(data)) {
        all = data;
      } else {
        all = Object.keys(data)
          .filter(function(k) { return !isNaN(k); })
          .map(function(k) { return data[k]; });
      }
      var users = all.filter(function(u) {
        var roles = (u._related && u._related.roles) || [];
        for (var i = 0; i < roles.length; i++) {
          if (roles[i].itemname === 'Spotlight') return true;
        }
        return false;
      });
      console.log('[SpotlightExperts] spotlight users (' + users.length + '/' + all.length + '):', users.map(function(u) { return u.username; }));
      renderUsers(sdk, users);
    })
    .catch(function(err) {
      console.error('[SpotlightExperts]', err);
      if (contentEl) contentEl.innerHTML = '<div class="se-state se-state--error">Unable to load spotlight experts. Please try again later.</div>';
    });

  sdk.on('propsChanged', function(newProps) {
    if (titleEl) titleEl.textContent = newProps.sectionTitle || sectionTitle;
    if (subtitleEl) subtitleEl.textContent = newProps.sectionSubtitle || sectionSubtitle;
  });
}

function getInitial(name) {
  return name ? name.charAt(0).toUpperCase() : '?';
}

function avatarHtml(user) {
  var src = user.avatar || '';
  if (src) {
    return '<img src="' + src + '" alt="' + user.username + '" onerror="this.parentNode.textContent=\'' + getInitial(user.username) + '\'">';
  }
  return getInitial(user.username || '');
}

function rankLabel(user) {
  return user.rank_display_name || '';
}

function hasSageSimian(user) {
  var badges = (user._related && user._related.badges) || [];
  for (var i = 0; i < badges.length; i++) {
    var title = (badges[i].title || '').toLowerCase();
    if (title.indexOf('sage') !== -1 || title.indexOf('simian') !== -1) return true;
  }
  return false;
}

function renderUsers(sdk, users) {
  var contentEl = sdk.$('#se-content');
  if (!users || !users.length) {
    if (contentEl) contentEl.innerHTML = '<div class="se-state">No spotlight experts found.</div>';
    return;
  }

  var html = '<div class="se-grid">';
  for (var i = 0; i < users.length; i++) {
    var u = users[i];
    var username = u.username || u.displayName || u.name || 'Community Member';
    var rank = rankLabel(u);
    var showBadge = hasSageSimian(u);

    var profileUrl = '/members/' + encodeURIComponent(username.toLowerCase()) + '-' + u.userid;
    html += '<a class="se-card" href="' + profileUrl + '" target="_blank" rel="noopener noreferrer">';
    html += '<div class="se-card__avatar">' + avatarHtml(u) + '</div>';
    html += '<div class="se-card__username">' + username + '</div>';
    html += '<div class="se-card__rank">' + (rank || '&nbsp;') + '</div>';
    if (showBadge) {
      html += '<div class="se-card__badge"><span class="se-card__badge-icon">&#127885;</span><span>Sage Simian</span></div>';
    }
    html += '</a>';
  }
  html += '</div>';

  if (contentEl) contentEl.innerHTML = html;
}
