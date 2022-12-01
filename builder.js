;(function () {
  var root = document.body

  var players = []
  var trackShips = false
  var syncShips = false
  var MAX_SYSTEMS = {
    capital: 4,
    frigate: 3,
  }
  const LOCAL_STORAGE_KEY = 'mf0ra-tools'

  function recalculatePPA() {
    calculatePPA(players, syncShips)
    saveState()
  }

  function saveState() {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({ players: players, track: trackShips, sync: syncShips }))
  }

  function SystemComponent() {
    var secondSystem = false

    function changeClass(system, newClass) {
      system.class = newClass
      if (system.class === 'attack') {
        changeAttackType(system, 'p')
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
          m('option', { value: 'p' }, 'Point defence'),
          m('option', { value: 'a' }, 'Assault'),
          m('option', { value: 's' }, 'Support'),
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
              m('option', { value: 'catapult' }, 'Catapult'),
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

  function ShipComponent() {
    function changeName(ship, newName) {
      ship.name = newName
    }

    function changeClass(ship, newClass) {
      if (ship.class !== newClass) {
        ship.class = newClass
        ship.systems = []
        var systems = MAX_SYSTEMS.hasOwnProperty(newClass) ? MAX_SYSTEMS[newClass] : 0
        for (var i = 0; i < systems; i++) {
          ship.systems.push({ class: '' })
        }
        saveState()
      }
    }

    function remove(fleet, ship) {
      var position = fleet.ships.indexOf(ship)
      fleet.ships.splice(position, 1)
      if (ship.hasAce) {
        fleet.aceSelected = false
      }
      recalculatePPA()
    }

    function duplicate(fleet, ship) {
      var position = fleet.ships.indexOf(ship)
      fleet.ships.splice(position, 0, copy(ship))
      recalculatePPA()
    }

    return {
      oninit: function (vnode) {
        var ship = vnode.attrs.ship
        if (!ship.class) {
          changeClass(ship, 'frigate')
        }
      },
      view: function (vnode) {
        var ship = vnode.attrs.ship
        var fleet = vnode.attrs.fleet

        return m('div', { class: 'column' }, [
          m('div', [
            m('input', {
              value: ship.name,
              oninput: function (e) {
                changeName(ship, e.target.value)
              },
            }),
            m(
              'button',
              {
                title: 'Copy',
                onclick: function () {
                  duplicate(fleet, ship)
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
                  remove(fleet, ship)
                },
                style: 'margin: 0px 10px 0px 5px',
              },
              '×',
            ),
            m('span', dice(ship)),
          ]),
          m('div', { class: 'row', style: 'gap: 5px' }, [
            m(
              'select',
              {
                value: ship.class,
                oninput: function (e) {
                  changeClass(ship, e.target.value)
                },
              },
              [m('option', { value: 'capital' }, 'Capital'), m('option', { value: 'frigate' }, 'Frigate')],
            ),
            ship.hasOwnProperty('systems')
              ? ship.systems.map(function (system) {
                  return m(SystemComponent, { system: system })
                })
              : null,
          ]),
        ])
      },
    }
  }

  function FleetComponent() {
    function add(fleet) {
      fleet.ships.push({ systems: [] })
      recalculatePPA()
    }

    return {
      oninit: function (vnode) {
        var fleet = vnode.attrs.fleet
        if (!fleet.hasOwnProperty('ships')) {
          fleet.ships = []
          for (var i = 0; i < fleet.tas; i++) {
            fleet.ships.push({})
          }
        }
      },
      view: function (vnode) {
        var fleet = vnode.attrs.fleet
        return m('div', [
          m('h3', fleet.name),
          fleet.ships.map(function (ship) {
            return m('div', { style: 'margin-bottom: 10px' }, [m(ShipComponent, { ship: ship, fleet: fleet })])
          }),
          m(
            'button',
            {
              onclick: function () {
                add(fleet)
              },
            },
            'Add ship',
          ),
        ])
      },
    }
  }

  function ShipTrackerComponent() {
    function setShips(newSyncShips) {
      syncShips = newSyncShips
      recalculatePPA()
    }

    return {
      view: function () {
        return m('div', { style: 'padding: 0 18px;' }, [
          m(
            'label',
            { style: 'float: right;margin-top: 5px' },
            'Sync PPA calculations with fleet builder',
            m('input', {
              onclick: function (e) {
                setShips(e.target.checked)
              },
              type: 'checkbox',
              checked: syncShips,
            }),
          ),
          players.map(function (player) {
            return m(FleetComponent, { fleet: player })
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
            disabled: syncShips,
            value: player.tas,
            oninput: function (e) {
              changeTas(player, e.target.value)
            },
          }),
          m('input', {
            type: 'number',
            min: 0,
            disabled: syncShips,
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
        syncShips = data.sync
        trackShips = data.track
      }
    },
    view: function () {
      function add() {
        players.push({
          name: 'Player',
          hva: 3,
          tas: 5,
          systems: 10,
          ppa: 5,
          ships: [],
        })
        recalculatePPA()
      }

      function setShips(newTrackShips) {
        trackShips = newTrackShips
        if (!trackShips) {
          syncShips = false
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
              m('span', 'Fleet id'),
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
                    location.href = 'battle.html?' + BATTLE_ID_PARAM + '=' + storeBattle(players, trackShips, syncShips)
                  },
                },
                'Fight!',
              ),
              m(
                'button',
                {
                  class: 'accordion ' + (trackShips ? 'active' : ''),
                  onclick: function (e) {
                    setShips(!trackShips)
                  },
                },
                'Fleet builder',
              ),
              trackShips ? m(ShipTrackerComponent) : null,
            ],
          ),
          m(FooterComponent, {}),
        ]),
      ]
    },
  }

  m.mount(root, main)
})()
