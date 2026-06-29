const DEFAULT_MEMBERS = [
  {
    name: "Michael",
    username: "@Twiggy",
    company: "TWIG MICHAEL POOLEY FLOWERS",
    location: "UK",
    avatar: "",
    card_color: "#d0e8f5",
    ask_me_about: "Retail, online, local delivery, merchandising, meta - google linked UK",
    favorite_part: "The Identity groups Square Champions and the UK product boards."
  },
  {
    name: "Jess",
    username: "@JessPoynter",
    company: "JESS POYNTER STYLE & SOLUTIONS",
    location: "BOTHELL, WA",
    avatar: "",
    card_color: "#f5c842",
    ask_me_about: "Beauty businesses, marketing, solopreneurship, Square hardware, reporting, Square online, Payroll",
    favorite_part: "Innovating and connecting with other entrepreneurs"
  },
  {
    name: "Aria",
    username: "@AriaChen",
    company: "ARIA CHEN CONSULTING",
    location: "SAN FRANCISCO, CA",
    avatar: "",
    card_color: "#d1fae5",
    ask_me_about: "E-commerce, product strategy, community building, and scaling small businesses",
    favorite_part: "The depth of knowledge members share and the genuine support for one another."
  },
  {
    name: "Marcus",
    username: "@MarcusReed",
    company: "REED CREATIVE STUDIOS",
    location: "AUSTIN, TX",
    avatar: "",
    card_color: "#ede9fe",
    ask_me_about: "Branding, creative services, Square for Retail, and social media marketing",
    favorite_part: "Finding peers who get the day-to-day realities of running a creative business."
  },
  {
    name: "Sofia",
    username: "@SofiaM",
    company: "SOFIA'S KITCHEN & CO.",
    location: "MIAMI, FL",
    avatar: "",
    card_color: "#fee2e2",
    ask_me_about: "Food & beverage, Square for Restaurants, loyalty programs, and local marketing",
    favorite_part: "The product boards — knowing my feedback actually shapes the roadmap."
  }
];

function initials(name) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function buildCard(member) {
  const card = document.createElement('div');
  card.className = 'member-card';

  const left = document.createElement('div');
  left.className = 'card-left';
  left.style.background = member.card_color || '#e0f2fe';

  if (member.avatar) {
    const img = document.createElement('img');
    img.className = 'avatar';
    img.src = member.avatar;
    img.alt = member.name;
    img.onerror = () => {
      const ph = document.createElement('div');
      ph.className = 'avatar-placeholder';
      ph.textContent = initials(member.name);
      img.replaceWith(ph);
    };
    left.appendChild(img);
  } else {
    const ph = document.createElement('div');
    ph.className = 'avatar-placeholder';
    ph.textContent = initials(member.name);
    left.appendChild(ph);
  }

  const nameEl = document.createElement('div');
  nameEl.className = 'member-name';
  nameEl.textContent = member.name;
  left.appendChild(nameEl);

  const usernameEl = document.createElement('div');
  usernameEl.className = 'member-username';
  usernameEl.textContent = member.username;
  left.appendChild(usernameEl);

  const right = document.createElement('div');
  right.className = 'card-right';

  const fields = document.createElement('div');

  if (member.ask_me_about) {
    const b1 = document.createElement('div');
    b1.className = 'field-block';
    b1.innerHTML = `<div class="field-label">Ask me about:</div><div class="field-value">${member.ask_me_about}</div>`;
    fields.appendChild(b1);
  }

  if (member.favorite_part) {
    const b2 = document.createElement('div');
    b2.className = 'field-block';
    b2.innerHTML = `<div class="field-label">My favorite part about the community is:</div><div class="field-value">${member.favorite_part}</div>`;
    fields.appendChild(b2);
  }

  right.appendChild(fields);

  if (member.company || member.location) {
    const meta = document.createElement('div');
    meta.className = 'card-meta';
    meta.textContent = [member.company, member.location].filter(Boolean).join(', ');
    right.appendChild(meta);
  }

  card.appendChild(left);
  card.appendChild(right);
  return card;
}

export async function init(sdk) {
  await sdk.whenReady();

  const track = sdk.$('.carousel-track');
  const dotsEl = sdk.$('.dots');
  const prevBtn = sdk.$('.nav-btn.prev');
  const nextBtn = sdk.$('.nav-btn.next');
  const heading = sdk.$('.section-heading');

  let currentIndex = 0;
  let members = [];
  const CARDS_PER_PAGE = 2;

  function totalPages() {
    return Math.max(1, Math.ceil(members.length / CARDS_PER_PAGE));
  }

  function membersFromProps(props) {
    const slots = [1, 2, 3, 4, 5];
    const out = [];
    for (const i of slots) {
      const name = props[`m${i}_name`];
      if (!name || !name.trim()) continue;
      out.push({
        name,
        username: props[`m${i}_username`] || '',
        company: props[`m${i}_company`] || '',
        location: props[`m${i}_location`] || '',
        avatar: props[`m${i}_avatar`] || '',
        card_color: props[`m${i}_card_color`] || '#e0f2fe',
        ask_me_about: props[`m${i}_ask_me_about`] || '',
        favorite_part: props[`m${i}_favorite_part`] || ''
      });
    }
    return out.length > 0 ? out : DEFAULT_MEMBERS;
  }

  function render(props) {
    if (heading) heading.textContent = props.heading || 'Meet the community';
    members = membersFromProps(props);

    // Rebuild track
    track.innerHTML = '';
    members.forEach(m => track.appendChild(buildCard(m)));

    // Rebuild dots
    dotsEl.innerHTML = '';
    for (let i = 0; i < totalPages(); i++) {
      const dot = document.createElement('button');
      dot.className = 'dot' + (i === currentIndex ? ' active' : '');
      dot.setAttribute('aria-label', `Go to page ${i + 1}`);
      dot.addEventListener('click', () => goTo(i));
      dotsEl.appendChild(dot);
    }

    goTo(Math.min(currentIndex, totalPages() - 1), false);
  }

  function goTo(index, animate = true) {
    currentIndex = Math.max(0, Math.min(index, totalPages() - 1));
    const cardWidthPct = 100 / CARDS_PER_PAGE;
    const offset = currentIndex * CARDS_PER_PAGE * cardWidthPct;
    track.style.transition = animate ? 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)' : 'none';
    track.style.transform = `translateX(-${offset}%)`;

    // Update dots
    sdk.$$('.dot').forEach((dot, i) => {
      dot.classList.toggle('active', i === currentIndex);
    });
  }

  prevBtn.addEventListener('click', () => goTo(currentIndex - 1));
  nextBtn.addEventListener('click', () => goTo(currentIndex + 1));

  render(sdk.getProps());
  sdk.on('propsChanged', render);
  sdk.on('destroy', () => {});
}
