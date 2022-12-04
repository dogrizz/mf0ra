;(function () {
  const root = document.body
  let battle = {}

  function MechComponent() {
    let mech = ''
    let team = ''

    function systemStateChange(system, newState) {
      system.disabled = newState
      if (mech.systems.filter((system) => !system.disabled).length === 0) {
        mech.destroyed = true
        team.tas--
        recalculate(team, battle.roster)
      } else if (mech.destroyed) {
        mech.destroyed = false
        team.tas++
        recalculate(team, battle.roster)
      }
      store(battle)
    }

    return {
      view: function (vnode) {
        mech = vnode.attrs.mech
        team = vnode.attrs.team

        return m('div', { class: 'column tas' }, [
          m('div', { class: 'row', style: 'gap: 5px' }, [m('h4', { class: mech.destroyed ? 'dead' : '' }, mech.name || 'noname')]),
          m('div', { class: 'row', style: 'gap: 3px' }, [
            m('span', 'Rockets:'),
            mech.rockets.map(function (rocket) {
              return m('input', {
                type: 'checkbox',
                checked: rocket.fired,
                onclick: function () {
                  rocket.fired = !rocket.fired
                  store(battle)
                },
              })
            }),
          ]),
          m('span', dice(mech)),
          mech.systems.map(function (system) {
            let systemText = system.class
            if (system.class === 'attack') {
              systemText = `${systemText} ${system.attackType}`
              if (system.attackType2) {
                systemText = `${systemText}/${system.attackType2}`
              }
            }
            return m(
              'label',
              m('input', {
                type: 'checkbox',
                checked: system.disabled,
                onclick: function (e) {
                  systemStateChange(system, e.target.checked)
                },
              }),
              systemText,
            )
          }),
        ])
      },
    }
  }

  function TeamComponent() {
    return {
      view: function (vnode) {
        const team = vnode.attrs.team
        return m('div', { class: 'column', style: 'gap: 10px' }, [
          m('h3', team.name),
          m('div', { class: 'row', style: 'gap: 15px' }, [team.mechs.map((mech) => m(MechComponent(), { mech: mech, team: team }))]),
        ])
      },
    }
  }

  function MechTrackerComponent() {
    return {
      view: function () {
        return m('div', { class: 'column', style: 'margin-top: 15px; gap: 15px' }, [
          battle.roster.map((team) => m(TeamComponent(), { team: team })),
        ])
      },
    }
  }

  function PlayerComponent() {
    function changeHva(player, newHva) {
      player.hva = parseInt(newHva)
      recalculate(player, battle.roster)
      store(battle)
    }

    function changeTas(player, newTas) {
      player.tas = parseInt(newTas)
      recalculate(player, battle.roster)
      store(battle)
    }

    return {
      oninit: function (vnode) {
        const player = vnode.attrs.player
        recalculate(player, battle.roster)
      },
      view: function (vnode) {
        const player = vnode.attrs.player
        return m('div', { class: 'column-justified' }, [
          m('span', player.name),
          m('input', {
            type: 'number',
            min: 0,
            value: player.hva,
            oninput: function (e) {
              changeHva(player, e.target.value)
            },
          }),
          m('input', {
            type: 'number',
            min: 0,
            disabled: battle.sync,
            value: player.tas,
            oninput: function (e) {
              changeTas(player, e.target.value)
            },
          }),
          m('span', player.ppa),
          m('span', player.total),
          m('span', player.role),
        ])
      },
    }
  }

  var main = {
    oninit: function () {
      const params = new URLSearchParams(window.location.search)
      if (params.has(BATTLE_ID_PARAM)) {
        battle = readBattle(params.get(BATTLE_ID_PARAM))
      }
    },
    view: function () {
      return [
        m(OptionsComponent, {}),
        m('main', { class: 'main column' }, [
          m('h1', 'MF0 Rapid Attack battle tracker'),
          !battle
            ? "Can't find your battle"
            : [
                m('div', { class: 'row', style: 'gap: 10px' }, [
                  m(
                    'div',
                    { class: 'column-justified' },
                    m('span', 'Fleet id'),
                    m('span', 'HVA'),
                    m('span', 'TAs'),
                    m('span', 'PPA'),
                    m('span', 'Total'),
                    m('span', 'Role'),
                  ),
                  battle.roster.map(function (player) {
                    return m(PlayerComponent, { player: player })
                  }),
                ]),
                battle.sync ? m(MechTrackerComponent) : null,
              ],
          m(FooterComponent, {}),
        ]),
      ]
    },
  }
  m.mount(root, main)
})()
