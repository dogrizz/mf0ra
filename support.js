const BATTLE_STORAGE_KEY = 'mf0ra-battles'
const BATTLE_ID_PARAM = 'battleId'

function calculatePPA(players, syncMechs) {
  if (players.length === 0) {
    return
  }
  players.forEach(function (player) {
    player.ppa = 5
  })
  if (syncMechs) {
    players.forEach(function (player) {
      player.tas = player.mechs.length
      player.systems = countSystems(player.mechs)
    })
  }
  var playersSorted = [...players].sort(function (a, b) {
    return b.tas - a.tas
  })
  var maxTas = parseInt(playersSorted[0].tas)
  var minTas = parseInt(playersSorted[playersSorted.length - 1].tas)

  playersSorted.sort(function (a, b) {
    return b.systems - a.systems
  })
  var maxSystems = parseInt(playersSorted[0].systems)
  var minSystems = parseInt(playersSorted[playersSorted.length - 1].systems)

  players.forEach(function (player) {
    if (parseInt(player.tas) == maxTas) {
      player.ppa = player.ppa - 1
    }
    if (parseInt(player.tas) == minTas) {
      player.ppa = player.ppa + 1
    }
    if (parseInt(player.systems) == maxSystems) {
      player.ppa = player.ppa - 1
    }
    if (parseInt(player.systems) == minSystems) {
      player.ppa = player.ppa + 1
    }
  })
}

function dice(mech) {
  if (mech.destroyed) {
    return ''
  }
  let diceDescription = ''
  if (!hasInternals(mech)) {
    diceDescription = '2W'
  } else {
    var internals = mech.systems.filter(function (system) {
      return system.class === 'internal' && !system.disabled
    }).length
    if (internals) {
      diceDescription = `${diceDescription}${internals}W`
    }
  }
  if (mech.hasOwnProperty('systems')) {
    var defence = mech.systems.filter(function (system) {
      return system.class === 'defence' && !system.disabled
    }).length
    if (defence) {
      defence = defence > 2 ? 2 : defence
      diceDescription = `${diceDescription}${defence}B`
    }

    var sensors = mech.systems.filter(function (system) {
      return system.class === 'sensor' && !system.disabled
    }).length
    if (sensors) {
      sensors = sensors > 2 ? 2 : sensors
      diceDescription = `${diceDescription}${sensors}Y`
    }
    
    var movement = mech.systems.filter(function (system) {
      return system.class === 'move' && !system.disabled
    }).length
    if (movement) {
      movement = movement > 2 ? 2 : movement
      diceDescription = `${diceDescription}${movement}G`
    }

    var attack = mech.systems.filter(function (system) {
      return system.class === 'attack' && !system.disabled
    })
    var attacks = {
      m: [],
      d: [],
      a: [],
    }
    attack.forEach(function (att) {
      if (att.hasOwnProperty('attackType2')) {
        attacks[att.attackType].push({ val: 1 })
        attacks[att.attackType2].push({ val: 1 })
      } else {
        attacks[att.attackType].push({ val: 2 })
      }
    })

    var atts = Object.entries(attacks)
    atts.forEach(function (att) {
      var val = att[1]
        .sort()
        .slice(0, 2)
        .map((att) => att.val)
        .reduce((a, b) => a + b, 0)
      if (val) {
        var dice = val <= 3 ? val : '2+d8'
        diceDescription = `${diceDescription}R${att[0]}${dice}`
      }
    })
  }

  return diceDescription
}

function countSystems(mechs) {
  var systems = 0
  mechs.forEach(function (mech) {
    mech.systems.forEach(function (system) {
      if (system.class != null && system.class !== '') {
        systems = systems + 1
      }
    })
  })
  return systems
}

function hash(str) {
  return str.split('').reduce((prev, curr) => (Math.imul(31, prev) + curr.charCodeAt(0)) | 0, 0)
}

function store(battle) {
  storeBattle(battle.roster, battle.track, battle.sync, battle.id)
}

function storeBattle(roster, trackMechs, syncMechs, id) {
  const oldData = localStorage.getItem(BATTLE_STORAGE_KEY)
  let data = JSON.stringify({ roster: roster, track: trackMechs, sync: syncMechs })
  let hashed = hash(data)
  if (id) {
    hashed = id
  }
  data = LZString.compress(data)
  let battles = {}
  if (oldData !== null) {
    battles = JSON.parse(oldData)
  }
  if (battles[hashed]) {
    battles[hashed].data = data
  } else {
    battles[hashed] = { data: data, date: Date.now() }
  }
  localStorage.setItem(BATTLE_STORAGE_KEY, JSON.stringify(battles))
  return hashed
}

function readBattles() {
  const battles = localStorage.getItem(BATTLE_STORAGE_KEY)
  if (battles === null) {
    return null
  }
  return JSON.parse(battles)
}

function readBattle(id) {
  const _id = parseInt(id)
  const battles = readBattles()
  if (battles.hasOwnProperty(_id)) {
    const decompressed = LZString.decompress(battles[_id].data)
    const battle = JSON.parse(decompressed)
    if (!battle.hasOwnProperty('id')) {
      battle.id = _id
    }
    if (!battle.track || !battle.sync) {
      battle.roster.forEach(function (player) {
        player.mechs = null
      })
      store(battle)
    } else {
      if (!alreadyAddedInternals(battle)) {
        battle.roster.forEach((player) => {
          player.id = self.crypto.randomUUID()
          player.mechs.forEach((mech) => {
            mech.owner = player.id
            mech.id = self.crypto.randomUUID()
            mech.systems.push({ class: 'internal' })
            mech.systems.push({ class: 'internal' })
            mech.systems = mech.systems.filter((system) => system.class)
            mech.systems = [...mech.systems].sort()
          })
        })
      }
    }

    return battle
  }
  return null
}

function alreadyAddedInternals(battle) {
  return battle.roster.some((player) => player.mechs.some((mech) => hasInternals(mech)))
}

function hasInternals(mech) {
  return mech.systems.some((system) => system.class === 'internal')
}

function copy(obj) {
  return JSON.parse(JSON.stringify(obj))
}

function recalculate(player, players) {
  player.total = player.ppa * (player.hva + player.tas)
  determineRole(players)
}

function determineRole(players) {
  const playersSorted = [...players].sort(function (a, b) {
    return b.total - a.total
  })
  const playersNumber = players.length
  players.forEach((player) => (player.role = ''))
  players.forEach((player) => {
    if (player.total === playersSorted[0].total) {
      player.role = 'Defender'
    }
    if (player.total === playersSorted[playersNumber - 1].total) {
      player.role = 'Primary attacker'
    }
  })
  players.forEach((player) => {
    if (player.role === '') {
      player.role = 'Secondary attacker'
    }
  })
}
