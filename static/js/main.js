
const queryGetUserID = `
query ($login: String) {
  user(where: { login: { _eq: $login } }) {
    id
    login
  }
}`

const queryProgressesByUserId = `
query ($userId: Int, $offset: Int) {
  progress(
    where: {
      userId: { _eq: $userId }
      isDone: { _eq: true }
      object: { type: { _eq: "project" } }
      grade: { _gt: 0 }
    }
    offset: $offset
    distinct_on: objectId
  ) {
    object {
      id
      name
      type
    }
    userId
    grade
    path
    createdAt
    updatedAt
    isDone
  }
}`

const queryTransactionByObjectID = `
query ($objectId: Int, $userId: Int) {
  transaction(
    order_by: { amount: desc }

    where: {
      objectId: { _eq: $objectId }
      type: { _eq: "xp" }
      user: { id: { _eq: $userId } }
    }
  ) {
    type
    amount
    object {
      name
    }
    createdAt
  }
}`

// total xp needed for this level
const totalXPForLevel = level =>
  Math.round((level * 0.66 + 1) * ((level + 2) * 150 + 50)) // 25 - 75K...

// cumul of all the xp needed to reach this level
const cumulXpForLevel = level =>
  level > 0 ? totalXPForLevel(level) + cumulXpForLevel(level - 1) : 0 // 25,recursive call; to 1 lvl; 25,24,23 xp +, 

// level reached for this xp
const getLevelFromXp = (xp, level = 0) =>
  cumulXpForLevel(level) >= xp ? level : getLevelFromXp(xp, level + 1)


let user = {
  username: '',
  password: '',
  token: '',
  id: 0
}

let progressChart = {
  dates: [],
  amounts: [],
  posXYAndTaskName: [],
  listProgress: [],
  objectNames: [],
  offsetIsDone: true,
  offset: 0,
  total: 0
}

// todo: , second Graphic
//own backaend - simple auth - return TOken - > show all info User
//try svg render

let progressResponse = null;
let amountResponse = null;

let c = document.querySelector("canvas[le]")

let h = 0
let w = 0


let y, x, ys, un, ctx, n, start, height;

const graphQLFetch = async (args, values) => {

  let url = `https://01.alem.school/api/graphql-engine/v1/graphql`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      // 'Authorization': `Bearer ` + user.token,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      query: args,
      variables: values
    })
  })
  return await response.json();
}

const setUserID = async () => {

  let username = document.getElementById('username').value
  if (username != "") {
    let resp = await graphQLFetch(queryGetUserID, { login: username })
    if (resp.data != undefined && resp.data.user.length > 0) {
      user.id = resp.data.user[0].id
      user.username = username
    } else {
      console.log(resp, 'incorrect username')
      // alert('incorrect username')
      return
    }
  } else {
    alert('empty field')
    return
  }
}

const setDefaultValues = () => {
  progressChart.dates = []
  progressChart.amounts = []
  progressChart.posXYAndTaskName = []
  progressChart.listProgress = []
  progressChart.objectNames = []
  progressChart.offsetIsDone = true
  progressChart.offset = 0
}

const getProgresses = async () => {


  while (progressChart.offsetIsDone) {
    progressResponse = await graphQLFetch(queryProgressesByUserId, { userId: user.id, offset: progressChart.offset })
    if (progressResponse.data != null) {
      if (progressResponse.data.progress.length == 0) {
        progressChart.offsetIsDone = false
      }
      progressChart.offset += 50
      progressChart.listProgress.push(...progressResponse.data.progress)
    } else {
      console.log('incorrect query || empty value')
      break
    }
  }
  progressChart.listProgress.sort(function (a, b) { return new Date(a.createdAt) - new Date(b.createdAt) });
}


const getTransactionByObjID = async () => {

  let temp = []

  for (const element of progressChart.listProgress) {
    amountResponse = await graphQLFetch(queryTransactionByObjectID, { objectId: element.object.id, userId: user.id })

    if (amountResponse.data != undefined && amountResponse.data.transaction.length > 0) {
      temp.push(amountResponse.data.transaction[0])
      progressChart.objectNames.push(element.object.name)
    }
  }

  temp.sort(function (a, b) { return new Date(a.createdAt) - new Date(b.createdAt) });
  let total = 0

  for (const element of temp) {
    progressChart.dates.push(element.createdAt)
    progressChart.amounts.push(element.amount)
    total += element.amount
  }

  progressChart.total = total
}


document.getElementById('chartProgressId').onclick = async () => {

  setDefaultValues()
  await setUserID()
  await getProgresses()
  await getTransactionByObjID()

  let level = getLevelFromXp(progressChart.total)

  if (level > 0) {
    document.getElementById('bio').textContent = ` Level: ` + level + ` UserName: ` + user.username + ` Total Xp: ` + progressChart.total
  }

  render()

}



const render = () => {
  h = c.height
  w = c.width

  ctx = c.getContext('2d')
  ctx.clearRect(0, 0, c.width, c.height);

  un = Math.round((Math.max(...progressChart.amounts) - Math.min(...progressChart.amounts)) / 10)
  ys = (w - 40) / progressChart.dates.length

  chartLine()
  // digram()
  setData()
  draw()
  pointes()
}

function draw() {

  ctx.save()
  ctx.strokeStyle = "#03a9f4"
  ctx.lineWidth = 3
  ctx.beginPath()
  y = 60
  height = h - 30
  let line = 30
  start = 30

  // un = Math.round((Math.max(...progressChart.amounts) - Math.min(...progressChart.amounts)) / 10)

  for (let data of progressChart.amounts) {
    let max = Math.max(...progressChart.amounts),
      test = 30;
    while (max > data) {
      max = max - 1
      test += line / un
    }
    ctx.lineTo(30 + y, test)
    x = 30
    y += ys
  }
  ctx.stroke()
  ctx.restore()
}


function digram() {
  y = 60
  x = 1
  ctx.strokeStyle = "#a7a7a7"
  while (y < w) {
    ctx.beginPath()
    ctx.moveTo(y, 0)
    ctx.lineTo(y, h - 30)
    ctx.stroke()
    y += 30
  }
  while (x < h - 30) {
    ctx.beginPath()
    ctx.moveTo(60, x)
    ctx.lineTo(w, x)
    ctx.stroke()
    x += 30
  }
}

function chartLine() {
  ctx.strokeStyle = "orange"
  ctx.beginPath()
  ctx.moveTo(60, 0)
  ctx.lineTo(60, h - 30)
  ctx.stroke()

  ctx.beginPath()
  ctx.moveTo(w, h - 30)
  ctx.lineTo(60, h - 30)
  ctx.stroke()
}


function pointes() {
  ctx.fillStyle = "orange"
  y = 60
  height = h - 30
  let line = 30
  start = 30

  let idx = 0
  let acc = 0
  //sum current + prev -> set Level

  for (let data of progressChart.amounts) {
    let max = Math.max(...progressChart.amounts),
      test = 30;
    acc += progressChart.amounts[idx]
    let lvl = getLevelFromXp(acc)

    while (max > data) {
      max = max - 1
      test += line / un
    }
    // console.log(test, 30 + y)
    circle(30 + y, test)
    progressChart.posXYAndTaskName.push({ data: Math.round(test) + "," + Math.round(30 + y) + "," + "Project: " + progressChart.objectNames[idx] + "; LVL : " + lvl })
    x = 30
    y += ys
    idx++

  }
  ctx.stroke()
}

function setData() {

  y = 60
  x = 30
  n = Math.max(...progressChart.amounts)

  let d, m, yr, t;
  for (let ydata of progressChart.dates) {
    t = new Date(ydata)
    yr = t.getFullYear()
    m = t.getMonth()
    d = t.getDate()
    ctx.font = "10px Arial";
    ctx.fillStyle = "#03a9f4"
    // console.log(yr,m, d )
    ctx.fillText(`${yr}-${m + 1}-${d}`, y, h - 10);
    y += ys
  }

  while (x < h - 30) {
    ctx.font = "10px Arial";
    ctx.fillText(n, 0, x + 5);
    n = n - un
    x += 30
  }
}

function circle(x, y) {
  ctx.beginPath();
  ctx.arc(x, y, 4, 0, 2 * Math.PI);
  ctx.fill()
}


c.onmousemove = function (e) {
  for (let data of progressChart.posXYAndTaskName) {
    for (const [key, value] of Object.entries(data)) {
      let dataG = value.split(","),
        lx = e.layerX,
        ly = e.layerY,
        dx = dataG[1],
        dy = dataG[0]
        // console.log(ly, dy, range(dy, Math.floor(dy)), 3, dx, lx)
      if (range(dx , Math.floor(dx) + 20).includes(lx) && range(dy - 10, Math.floor(dy) + 80).includes(ly)) {
        // console.log(ly, dy, range(dy, Math.floor(dy)), 6023, dx, lx)
        $('draw-canvas-data-set').innerHTML = dataG[2]
        $('draw-canvas-data-set').style.opacity = "1"
        $('draw-canvas-data-set').style.left = e.clientX + "px"
        $('draw-canvas-data-set').style.top = e.clientY + "px"
      } if (range(dx , Math.floor(dx) + 20).includes(lx) && !range(dy - 10, Math.floor(dy) + 80).includes(ly)) {
        $('draw-canvas-data-set').style.opacity = "0"
      }
      lx = lx - 1
      dx = dx - 1
    }
  }
}


function range(start, end) {
  let range = [...Array(end + 1).keys()].filter(value => end >= value && start <= value);
  return range
}
function $(object) {
  return document.querySelector(object);
}