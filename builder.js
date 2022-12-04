;(function () {
  var root = document.body

  var players = []
  var trackMechs = false
  var syncMechs = false
  const MAX_ROCKETS = 3
  const LOCAL_STORAGE_KEY = 'mf0ra-tools'

  function recalculatePPA() {
    calculatePPA(players, syncMechs)
    saveState()
  }

  function saveState() {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({ players: players, track: trackMechs, sync: syncMechs }))
  }

  function RocketsComponent() {
    return {
      view: function (vnode) {
        const team = vnode.attrs.team
        const mech = vnode.attrs.mech
        const checkboxes = []
        const hide = team.rockets === MAX_ROCKETS && !(mech.rockets > 0)
        checkboxes.push(m('span', { hidden: hide }, 'Rockets: '))
        for (var i = 0; i < MAX_ROCKETS; i++) {
          checkboxes.push(
            m('input', {
              type: 'checkbox',
              hidden: team.rockets === MAX_ROCKETS && i >= mech.rockets,
              checked: i < mech.rockets,
              onclick: function (e) {
                const add = e.target.checked
                if (add) {
                  team.rockets = team.rockets + 1
                  mech.rockets = mech.rockets + 1
                } else {
                  team.rockets = team.rockets - 1
                  mech.rockets = mech.rockets - 1
                }
                saveState()
              },
            }),
          )
        }
        return checkboxes
      },
    }
  }

  function SystemComponent() {
    var secondSystem = false

    function changeClass(system, newClass) {
      system.class = newClass
      if (system.class === 'attack') {
        changeAttackType(system, 'd')
      }
      recalculatePPA()
    }

    function changeAttackType(system, newType) {
      system.attackType = newType
      saveState()
    }

    function changeAttackType2(system, newType) {
      system.attackType2 = newType
      saveState()
    }

    function flipSecondSystem(system) {
      secondSystem = !secondSystem
      if (!secondSystem) {
        delete system.attackType2
      }
      saveState()
    }

    return {
      oninit: function (vnode) {
        var system = vnode.attrs.system
        secondSystem = system.attackType2
      },
      view: function (vnode) {
        var system = vnode.attrs.system
        var weapons = [
          m('option', { value: 'm' }, 'Melee'),
          m('option', { value: 'd' }, 'Direct'),
          m('option', { value: 'a' }, 'Artillery'),
        ]
        return [
          m(
            'select',
            {
              value: system.class,
              oninput: function (e) {
                changeClass(system, e.target.value)
              },
            },
            [
              m('option', { value: '' }, ''),
              m('option', { value: 'attack' }, 'Attack'),
              m('option', { value: 'defence' }, 'Defence'),
              m('option', { value: 'sensor' }, 'Sensors'),
              m('option', { value: 'move' }, 'Movement'),
            ],
          ),
          system.class === 'attack'
            ? m('div', [
                m(
                  'select',
                  {
                    value: system.attackType,
                    oninput: function (e) {
                      changeAttackType(system, e.target.value)
                    },
                  },
                  weapons,
                ),
                secondSystem
                  ? m(
                      'select',
                      {
                        value: system.attackType2,
                        oninput: function (e) {
                          changeAttackType2(system, e.target.value)
                        },
                      },
                      weapons,
                    )
                  : null,
                m(
                  'button',
                  {
                    onclick: function () {
                      flipSecondSystem(system)
                    },
                  },
                  secondSystem ? '-' : '+',
                ),
              ])
            : null,
        ]
      },
    }
  }

  function MechComponent() {
    function changeName(mech, newName) {
      mech.name = newName
    }

    function remove(team, mech) {
      var position = team.mechs.indexOf(mech)
      team.mechs.splice(position, 1)
      recalculatePPA()
    }

    function duplicate(team, mech) {
      var position = team.mechs.indexOf(mech)
      team.mechs.splice(position, 0, copy(mech))
      recalculatePPA()
    }

    return {
      oninit: function (vnode) {
        var mech = vnode.attrs.mech
      },
      view: function (vnode) {
        var mech = vnode.attrs.mech
        var team = vnode.attrs.team

        return m('div', { class: 'column' }, [
          m('div', [
            m('input', {
              value: mech.name,
              oninput: function (e) {
                changeName(mech, e.target.value)
              },
            }),
            m(
              'button',
              {
                title: 'Copy',
                onclick: function () {
                  duplicate(team, mech)
                },
                style: 'margin-left: 5px',
              },
              '📋',
            ),
            m(
              'button',
              {
                title: 'Remove',
                onclick: function () {
                  remove(team, mech)
                },
                style: 'margin: 0px 10px 0px 5px',
              },
              '×',
            ),
            m('span', { style: 'margin-right: 10px' }, dice(mech)),
            m(RocketsComponent, { mech: mech, team: team }),
          ]),
          m('div', { class: 'row', style: 'gap: 5px' }, [
            mech.hasOwnProperty('systems')
              ? mech.systems.map(function (system) {
                  return m(SystemComponent, { system: system })
                })
              : null,
          ]),
        ])
      },
    }
  }

  function TeamComponent() {
    function add(team) {
      team.mechs.push({ systems: [{ class: '' }, { class: '' }, { class: '' }, { class: '' }], rockets: 0 })
      recalculatePPA()
      saveState()
    }

    return {
      oninit: function (vnode) {
        var team = vnode.attrs.team
        if (!team.hasOwnProperty('mechs')) {
          team.mechs = []
          for (var i = 0; i < team.tas; i++) {
            team.mechs.push({})
          }
        }
      },
      view: function (vnode) {
        var team = vnode.attrs.team
        return m('div', [
          m('h3', team.name),
          team.mechs.map(function (mech) {
            return m('div', { style: 'margin-bottom: 10px' }, [m(MechComponent, { mech: mech, team: team })])
          }),
          m(
            'button',
            {
              onclick: function () {
                add(team)
              },
            },
            'Add mech',
          ),
        ])
      },
    }
  }

  function MechTrackerComponent() {
    function setMechs(newsyncMechs) {
      syncMechs = newsyncMechs
      recalculatePPA()
    }

    return {
      view: function () {
        return m('div', { style: 'padding: 0 18px;' }, [
          m(
            'label',
            { style: 'float: right;margin-top: 5px' },
            'Sync PPA calculations with team builder',
            m('input', {
              onclick: function (e) {
                setMechs(e.target.checked)
              },
              type: 'checkbox',
              checked: syncMechs,
            }),
          ),
          players.map(function (player) {
            return m(TeamComponent, { team: player })
          }),
        ])
      },
    }
  }

  function PlayerComponent() {
    function changeName(player, newName) {
      player.name = newName
    }
    function changeHva(player, newHva) {
      player.hva = parseInt(newHva)
      recalculatePPA()
    }

    function changeTas(player, newTas) {
      player.tas = parseInt(newTas)
      recalculatePPA()
    }

    function changeSystems(player, newSystems) {
      player.systems = parseInt(newSystems)
      recalculatePPA()
    }

    function remove(player) {
      var position = players.indexOf(player)
      players.splice(position, 1)
      recalculatePPA()
    }

    return {
      view: function (vnode) {
        var player = vnode.attrs.player
        return m(
          'div',

          { class: 'column-justified' },
          m(
            'div',
            { class: 'row' },
            m('input', {
              value: player.name,
              oninput: function (e) {
                changeName(player, e.target.value)
              },
            }),
            m(
              'button',
              {
                title: 'Remove',
                onclick: function () {
                  remove(player)
                },
              },
              '×',
            ),
          ),
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
            disabled: syncMechs,
            value: player.tas,
            oninput: function (e) {
              changeTas(player, e.target.value)
            },
          }),
          m('input', {
            type: 'number',
            min: 0,
            disabled: syncMechs,
            value: player.systems,
            oninput: function (e) {
              changeSystems(player, e.target.value)
            },
          }),
          m('span', player.ppa),
          m('span', player.ppa * (player.hva + player.tas)),
        )
      },
    }
  }

  var main = {
    oninit: function () {
      let oldData = localStorage.getItem(LOCAL_STORAGE_KEY)
      if (oldData !== null) {
        data = JSON.parse(oldData)
        players = data.players
        syncMechs = data.sync
        trackMechs = data.track
      }
    },
    view: function () {
      function add() {
        players.push({
          name: 'Player',
          rockets: 0,
          hva: 3,
          tas: 5,
          systems: 10,
          ppa: 5,
          mechs: [],
        })
        recalculatePPA()
      }

      function setMechs(newTrackMechs) {
        trackMechs = newTrackMechs
        if (!trackMechs) {
          syncMechs = false
        }
      }

      return [
        m(OptionsComponent, {}),
        m('main', { class: 'main column' }, [
          m('h1', 'MF0 Rapid Attack points per asset calculator'),
          m('div', { class: 'row' }, [
            m(
              'div',
              { class: 'column-justified' },
              m('span', 'Team id'),
              m('span', 'HVA'),
              m('span', 'TAs'),
              m('span', 'Systems'),
              m('span', 'PPA'),
              m('span', 'Total'),
            ),
            players.map(function (player) {
              return m(PlayerComponent, { player: player })
            }),
            m('button', { onclick: add }, 'Add player'),
          ]),
          m(
            'div',
            {
              class: 'column',
              style: 'margin-top: 10px; gap: 10px',
            },
            [
              m(
                'button',
                {
                  disabled: players.length === 0,
                  onclick: function () {
                    location.href = 'battle.html?' + BATTLE_ID_PARAM + '=' + storeBattle(players, trackMechs, syncMechs)
                  },
                },
                'Fight!',
              ),
              m(
                'button',
                {
                  class: 'accordion ' + (trackMechs ? 'active' : ''),
                  onclick: function (e) {
                    setMechs(!trackMechs)
                  },
                },
                'Team builder',
              ),
              trackMechs ? m(MechTrackerComponent) : null,
            ],
          ),
          m(FooterComponent, {}),
        ]),
      ]
    },
  }

  m.mount(root, main)
})()
