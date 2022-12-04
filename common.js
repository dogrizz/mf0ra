function OptionsComponent() {
  return {
    view: function (vnode) {
      return [
        m(
          'a',
          {
            title: 'Dark/Light mode',
            href: '#',
            style: 'float: right;text-decoration: none;',
            onclick: function () {
              document.body.classList.toggle('dark-mode')
            },
          },
          '🌓',
        ),
        vnode.attrs.hideBattleLink
          ? null
          : m(
              'a',
              {
                title: 'Browse running battles',
                href: 'battles.html',
                style: 'float: right;margin-right: 15px;text-decoration: none;',
              },
              '🕮',
            ),
      ]
    },
  }
}

function FooterComponent() {
  return {
    view: function () {
      return m('footer', [
        m('span', 'Please '),
        m('a', { target: '_blank', href: 'https://www.patreon.com/Joshua' }, 'support one of'),
        m('a', { target: '_blank', href: 'https://lumpley.games/' }, ' creators'),
        m('span', ' or '),
        m('a', { target: '_blank', href: 'https://glyphpress.com/talk/product/mobile-frame-zero-001-rapid-attack' }, 'buy a rulebook'),
        m('div', { class: 'disclaimer' }, [m('span', 'I am not the creator ;)')]),
      ])
    },
  }
}
