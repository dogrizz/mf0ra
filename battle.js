;(function () {
  const root = document.body
  let battle = {}

  function CompanyComponent() {
    let company = ''
    let fleet = ''

    function systemStateChange(system, newState) {
      system.disabled = newState
      if (company.systems.filter((system) => !system.disabled).length === 0) {
        company.destroyed = true
        fleet.tas--
        recalculate(fleet, battle.roster)
      } else if (company.destroyed) {
        company.destroyed = false
        fleet.tas++
        recalculate(fleet, battle.roster)
      }
      store(battle)
    }

    function fuelChange(comp) {
      comp.outOfFuel = !comp.outOfFuel
      if (comp.outOfFuel) {
        fleet.tas--
      } else {
        fleet.tas++
      }
      recalculate(fleet, battle.roster)
      store(battle)
    }

    return {
      view: function (vnode) {
        company = vnode.attrs.company
        fleet = vnode.attrs.fleet

        return m('div', { class: 'column tas' }, [
          m('div', { class: 'row', style: 'gap: 5px' }, [
            m(
              'h4',
              { class: company.destroyed || company.outOfFuel ? 'dead' : '' },
              company.aceType ? `${company.aceType} ace` : 'Company',
            ),
            m(
              'button',
              {
                title: 'Fuel state',
                onclick: function () {
                  fuelChange(company)
                },
              },
              '⛽',
            ),
          ]),
          m('span', companyDice(company)),
          m('span', `origin: ${company.origin}`),
          company.systems.map(function (system) {
            return m(
              'label',
              m('input', {
                type: 'checkbox',
                checked: system.disabled,
                disabled: company.outOfFuel,
                onclick: function (e) {
                  systemStateChange(system, e.target.checked)
                },
              }),
              system.class,
            )
          }),
        ])
      },
    }
  }

  function ShipComponent() {
    let ship = ''
    let fleet = ''

    function systemStateChange(system, newState) {
      system.disabled = newState
      if (ship.systems.filter((system) => !system.disabled).length === 0) {
        ship.destroyed = true
        fleet.tas--
        recalculate(fleet, battle.roster)
      } else if (ship.destroyed) {
        ship.destroyed = false
        fleet.tas++
        recalculate(fleet, battle.roster)
      }
      store(battle)
    }

    function startTransfer(ship) {
      if (battle.roster.length === 2) {
        transfer(ship, battle.roster.filter((f) => f != fleet)[0])
      } else {
        ship.showPopup = true
      }
    }

    function transfer(ship, targetFleet) {
      fleet.tas--
      targetFleet.tas++
      fleet.ships.splice(fleet.ships.indexOf(ship), 1)
      targetFleet.ships.push(ship)
      store(battle)
    }

    return {
      view: function (vnode) {
        ship = vnode.attrs.ship
        fleet = vnode.attrs.fleet

        return m('div', { class: ship.owner !== fleet.id ? 'column tas captured' : 'column tas' }, [
          m('div', { class: 'row', style: 'gap: 5px' }, [
            m('h4', { class: ship.destroyed ? 'dead' : '' }, ship.name || 'noname'),
            m(
              'button',
              {
                title: 'Transfer',
                hidden: ship.destroyed,
                onclick: function () {
                  startTransfer(ship)
                },
              },
              '⇌',
            ),
            m(
              'div',
              { class: ship.showPopup ? 'overlay overlay-show' : 'overlay' },
              m('div', { class: 'column popup', style: 'gap: 10px' }, [
                m('div', { class: 'row', style: 'justify-content: space-between;margin-bottom: 10px' }, [
                  m('h3', `Transfer ship ${ship.name} to:`),
                  m(
                    'button',
                    {
                      style: 'float: right',
                      onclick: function () {
                        ship.showPopup = false
                      },
                    },
                    '×',
                  ),
                ]),
                battle.roster
                  .filter((f) => f !== fleet)
                  .map((player) =>
                    m(
                      'button',
                      {
                        onclick: function () {
                          ship.showPopup = false
                          transfer(ship, player)
                        },
                      },
                      player.name,
                    ),
                  ),
              ]),
            ),
          ]),
          m('span', dice(ship)),
          ship.systems.map(function (system) {
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

  function FleetComponent() {
    return {
      view: function (vnode) {
        const fleet = vnode.attrs.fleet
        return m('div', { class: 'column', style: 'gap: 10px' }, [
          m('h3', fleet.name),
          m('div', { class: 'row', style: 'gap: 15px' }, [fleet.ships.map((ship) => m(ShipComponent(), { ship: ship, fleet: fleet }))]),
          m('div', { class: 'row', style: 'gap: 15px' }, [
            fleet.companies.map((company) => m(CompanyComponent(), { company: company, fleet: fleet })),
          ]),
        ])
      },
    }
  }

  function ShipTrackerComponent() {
    return {
      view: function () {
        return m('div', { class: 'column', style: 'margin-top: 15px; gap: 15px' }, [
          battle.roster.map((fleet) => m(FleetComponent(), { fleet: fleet })),
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
                battle.sync ? m(ShipTrackerComponent) : null,
              ],
          m(FooterComponent, {}),
        ]),
      ]
    },
  }
  m.mount(root, main)
})()
