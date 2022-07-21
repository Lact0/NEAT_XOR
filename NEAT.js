function sigmoid(z) {
  return (1 / (1 + Math.exp(-z))) * 2 - 1;
}

class Neat {
  constructor(numIn, numOut, params = {}) {
    //params is an object
    this.globalInnovation = [1];
    this.gen = 0;
    this.numIn = numIn;
    this.numOut = numOut;
    this.table = {};
    this.allowRecurrent = params['allowRecurrent'] || false;
    this.mutationRate = params['mutationRate'] || .4;
    this.c1 = params['c1'] || 2;
    this.c2 = params['c2'] || 2;
    this.c3 = params['c3'] || 1;
    this.popSize = params['popSize'] || 100;
    this.threshold = params['threshold'] || 6;
    this.startMut = params['startMut'] || 3;
    this.dropOffAge = params['dropOffAge'] || 20;
    this.elitism = params['elitism'] || true;
    this.targetNumSpecies = params['targetNumSpecies'] || 5;
    this.thresholdStepSize = params['thresholdStepSize'] || .1;

    this.pop = [];
    this.fitness = [];
    for(let i = 0; i < this.popSize; i++) {
      const net = new Net(numIn, numOut);
      for(let j = 0; j < this.startMut; j++) {
        net.mutate(this.globalInnovation, this.table, this.allowRecurrent);
      }
      this.pop.push(net);
      this.fitness.push(0);
    }

    this.species = [];
    this.curSpecies = [];
    this.globalSpeciesInnovation = 0;

    const inSpecies = [];
    for(let i = 0; i < this.popSize; i++) {
      inSpecies.push(false);
    }
    let leftToSpeciate = this.popSize;
    while(leftToSpeciate > 0) {
      let ind = 0;
      while(inSpecies[ind]) {
        ind++;
      }
      const newSpecies = [ind];
      const basis = this.pop[ind];
      inSpecies[ind] = true;
      leftToSpeciate--;
      for(let i = 0; i < this.popSize; i++) {
        if(!inSpecies[i] && basis.checkDistance(this.pop[i], this.c1, this.c2, this.c3) < this.threshold) {
          newSpecies.push(i);
          leftToSpeciate--;
          inSpecies[i] = true;
        }
      }
      this.curSpecies.push(this.globalSpeciesInnovation);
      this.species.push([newSpecies, this.dropOffAge, 0]);
      this.globalSpeciesInnovation++;
    }
  }

  step() {
    // GET ADJUSTED FITNESSES AND SCORES OF EACH SPECIES
    const adjustedFitness = [];
    for(let i = 0; i < this.popSize; i++) {
      adjustedFitness.push(0);
    }
    let totalScores = 0;
    const speciesScores = [];
    for(let i = 0; i < this.curSpecies.length; i++) {
      let total = 0;
      const x = this.curSpecies[i];
      let speciesScore = 0;
      for(let j = 0; j < this.species[x][0].length; j++) {
        const newFitness = this.fitness[this.species[x][0][j]] / this.species[x][0].length;
        adjustedFitness[this.species[x][0][j]] = newFitness;
        speciesScore += newFitness;
      }
      speciesScores.push(speciesScore);
      totalScores += speciesScore;
    }

    //GET NUMBER OF CHILDREN ALLOWED TO EACH SPECIES
    const numChildren = [];
    let total = 0;
    for(let i = 0; i < this.curSpecies.length; i++) {
      const children = Math.floor((speciesScores[i] / totalScores) * this.popSize);
      numChildren.push(children);
      total += children;
    }
    while(total < this.popSize) {
      let mn = this.popSize;
      let mnInd = 0;
      for(let i = 0; i < numChildren.length; i++) {
        if(numChildren[i] < mn) {
          mn = numChildren[i];
          mnInd = i;
        }
      }
      numChildren[mnInd]++;
      total++;
    }
    console.log(speciesScores);

    //CHECK FOR SPECIES TO CUTOFF
    for(let i = 0; i < this.curSpecies.length; i++) {
      const x = this.curSpecies[i];
      if(this.species[x][2] > speciesScores[i]) {
        this.species[x][1]--;
      } else {
        this.species[x][1] = this.dropOffAge;
        this.species[x][2] = speciesScores[i];
      }
      if(this.species[x][1] == 0) {
        numChildren[i] = 0;
      }
    }

    //CREATE CHILDREN, MUTATE AND ADD TO NEW POP
    const newPop = [];
    for(let i = 0; i < this.curSpecies.length; i++) {
      const species = this.species[this.curSpecies[i]][0];
      if(this.elitism && numChildren[i] > 0) {
        let mx = 0;
        let mxNet = species[0];
        for(let j = 0; j < species.length; j++) {
          const ind = species[j];
          if(this.fitness[ind] > mx) {
            mx = this.fitness[ind];
            mxNet = this.pop[ind];
          }
        }
        newPop.push(mxNet);
        numChildren[i]--;
      }
      for(let j = 0; j < numChildren[i]; j++) {
        const parents = [];
        for(let k = 0; k < 2; k++) {
          let n = Math.random() * speciesScores[i];
          let ind = -1;
          while(n > 0) {
            ind++;
            const realInd = species[ind];
            n -= adjustedFitness[realInd];
          }
          parents.push(species[ind]);
        }
        if(this.fitness[parents[0]] < this.fitness[parents[1]]) {
          const temp = parents[1];
          parents[1] = parents[0];
          parents[0] = temp;
        }
        parents[0] = this.pop[parents[0]];
        parents[1] = this.pop[parents[1]];
        let child;
        try {
          child = parents[0].makeChild(parents[1]);
        } catch(e) {
          alert('ERROR, CHECK CONSOLE');
          console.log(e);
          console.log(parents[0], parents[1]);
          return;
        }

        if(Math.random() < this.mutationRate) {
          child.mutate(this.globalInnovation, this.table, this.allowRecurrent);
        }
        newPop.push(child);
      }
    }

    //FILL LEFTOVER SPACE IN POP WITH NEW CREATURES
    while(newPop.length < this.popSize) {
      const net = new Net(this.numIn, this.numOut);
      for(let j = 0; j < this.startMut; j++) {
        net.mutate(this.globalInnovation, this.table, this.allowRecurrent);
      }
      newPop.push(net);
    }

    //SPECIATE w/ OLD SPECIES
    const inSpecies = [];
    let leftToSpeciate = this.popSize;
    for(let i = 0; i < this.popSize; i++) {
      inSpecies.push(false);
    }

    shuffle(this.curSpecies);
    const toRemove = [];
    for(let i = 0; i < this.curSpecies.length; i++) {
      const speciesNum = this.curSpecies[i];
      const species = this.species[speciesNum][0];
      const headNet = this.pop[species[rand(0, species.length - 1)]];
      const newSpecies = [];
      for(let j = 0; j < newPop.length; j++) {
        //GO THROUGH NEW SPECIES AND CHECK IF UNDER THRESHOLD, UPDATE inSpecies AND leftToSpeciate
        const net = this.pop[j];
        if(!inSpecies[j] && headNet.checkDistance(net, this.c1, this.c2, this.c3) < this.threshold) {
          inSpecies[j] = true;
          leftToSpeciate--;
          newSpecies.push(j);
        }
      }
      this.species[speciesNum][0] = newSpecies;
      if(newSpecies.length == 0) {
        toRemove.push(speciesNum);
      }
    }

    //SPECIATE THE REJECTS
    while(leftToSpeciate > 0) {
      let ind = 0;
      while(inSpecies[ind]) {
        ind++;
      }
      const newSpecies = [ind];
      const basis = this.pop[ind];
      inSpecies[ind] = true;
      leftToSpeciate--;
      for(let i = 0; i < this.popSize; i++) {
        if(!inSpecies[i] && basis.checkDistance(this.pop[i], this.c1, this.c2, this.c3) < this.threshold) {
          newSpecies.push(i);
          leftToSpeciate--;
          inSpecies[i] = true;
        }
      }
      this.curSpecies.push(this.globalSpeciesInnovation);
      this.species.push([newSpecies, this.dropOffAge, 0]);
      this.globalSpeciesInnovation++;
    }

    //OH YEAH IT HAPPENS HERE
    this.pop = newPop;

    //REMOVE SPECIES THAT DO NOT EXIST
    for(let i = 0; i < toRemove.length; i++) {
      remove(this.curSpecies, toRemove[i]);
    }

    //UPDATE threshold
    if(this.curSpecies.length > this.targetNumSpecies) {
      this.threshold += this.thresholdStepSize;
    } else if(this.curSpecies.length < this.targetNumSpecies) {
      this.threshold -= this.thresholdStepSize;
    }
    this.threshold = Math.round(this.threshold * 10) / 10;

    this.gen++;
  }
}

class Net {
  constructor(numIn, numOut) {
    this.nodes = [];
    this.conn = [];
    this.struct = [];
    this.numIn = numIn;
    this.numOut = numOut;
    let temp = [];
    for(let i = 0; i < numIn; i++) {
      const newNode = new Node(this.nodes.length + 1, 'inp');
      this.nodes.push(newNode);
      temp.push(newNode);
    }
    const newNode = new Node(this.nodes.length + 1, 'bias');
    this.nodes.push(newNode);
    temp.push(newNode);
    this.struct.push(temp);
    temp = [];
    for(let i = 0; i < numOut; i++) {
      const newNode = new Node(this.nodes.length + 1, 'out');
      this.nodes.push(newNode);
      temp.push(newNode);
    }
    this.struct.push(temp);
  }

  draw(x, y, w, h) {
    //Assumes ctx is already defined
    ctx.clearRect(x, y, w, h);
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, h);

    const xUnit = w / (this.struct.length + 1);
    const nodeWidth = min(w / (this.struct.length * 15), 10);

    for(let i = 0; i < this.conn.length; i++) {
      const conn = this.conn[i];
      if(!conn.enabled) {
        continue;
      }
      if(conn.weight > 0) {
        ctx.strokeStyle = 'rgba(0, ' + (200 * conn.weight) + ', 0, 1)';
      } else {
        ctx.strokeStyle = 'rgba(' + Math.abs(200 * conn.weight) + ', 0, 0, 1)';
      }
      ctx.lineWidth = (nodeWidth / 2) * Math.abs(conn.weight);
      const minThickness = .4;
      const maxThickness = (nodeWidth / 2);
      ctx.lineWidth = max(min(ctx.lineWidth, maxThickness), minThickness);
      let pos1 = this.findNodePos(conn.in);
      let pos2 = this.findNodePos(conn.out);
      pos1 = [x + xUnit * (pos1[0] + 1) + nodeWidth, y + (h / (this.struct[pos1[0]].length + 1)) * (pos1[1] + 1)];
      pos2 = [x + xUnit * (pos2[0] + 1) - nodeWidth, y + (h / (this.struct[pos2[0]].length + 1)) * (pos2[1] + 1)];
      ctx.beginPath();
      ctx.moveTo(pos1[0], pos1[1]);
      ctx.lineTo(pos2[0], pos2[1]);
      ctx.stroke();
    }
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'white';
    for(let i = 0; i < this.struct.length; i++) {
      const yUnit = h / (this.struct[i].length + 1);
      for(let j = 0; j < this.struct[i].length; j++) {
        if(this.struct[i][j].out > 0) {
          ctx.fillStyle = 'rgba(0, ' + (200 * this.struct[i][j].out) + ', 0, 1)';
        } else {
          ctx.fillStyle = 'rgba(' + Math.abs(200 * this.struct[i][j].out) + ', 0, 0, 1)';
        }
        ctx.beginPath();
        ctx.arc(x + xUnit * (i + 1), y + yUnit * (j + 1), nodeWidth, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
      }
    }
  }

  findNodePos(n) {
    for(let i = 0; i < this.struct.length; i++) {
      for(let j = 0; j < this.struct[i].length; j++) {
        if(this.struct[i][j].n == n) {
          return [i, j];
        }
      }
    }
    return false;
  }

  pass(inp) {
    for(let i = 0; i < this.numIn; i++) {
      this.nodes[i].out = inp[i];
    }
    for(let i = 1; i < this.struct.length; i++) {
      for(let j = 0; j < this.struct[i].length; j++) {
        const n = this.struct[i][j].n;
        inp = [];
        for(let k = 0; k < this.conn.length; k++) {
          if(this.conn[k].out == n && this.conn[k].enabled) {
            inp.push(this.conn[k].weight * this.nodes[this.conn[k].in - 1].out);
          }
        }
        this.struct[i][j].pass(inp);
      }
    }
    inp = [];
    for(let i = this.numIn + 1; i < this.numIn + this.numOut + 1; i++) {
      inp.push(this.nodes[i].out);
    }
    return inp;
  }

  addConn(globalNum, table, allowRecurrent) {
    let beg = rand(1, this.nodes.length);
    let end = rand(1, this.nodes.length);
    let counter = 0;
    while(!this.checkValidConn(beg, end, allowRecurrent)) {
      beg = rand(1, this.nodes.length);
      end = rand(1, this.nodes.length);
      counter++;
      if(counter == 100) {
        return false;
      }
    }
    const newConn = new Connection(beg, end);
    const key = String(beg) + ',' + String(end);
    newConn.name(globalNum, table);
    this.conn.push(newConn);
    return true;
  }

  checkValidConn(beg, end, allowRecurrent) {
    let pos1 = this.findNodePos(beg);
    let pos2 = this.findNodePos(end);
    if(pos1[0] == pos2[0]) {
      return false;
    }
    if(!allowRecurrent && pos2[0] < pos1[0]) {
      return false;
    }
    for(let i = 0; i < this.conn.length; i++) {
      const conn = this.conn[i];
      if(conn.in == beg && conn.out == end) {
        return false;
      }
    }
    return true;
  }

  addNode(globalNum, table, allowRecurrent) {
    if(this.conn.length == 0) {
      return false;
    }
    let conn = this.conn[rand(0, this.conn.length - 1)];
    let counter = 0;
    while(conn.rec || !conn.enabled) {
      conn = this.conn[rand(0, this.conn.length - 1)];
      counter++;
      if(counter == 25) {
        return false;
      }
    }
    conn.enabled = false;
    const newNode = new Node(this.nodes.length + 1, 'hid');
    this.nodes.push(newNode);

    const conn1 = new Connection(conn.in, newNode.n);
    conn1.weight = 1;
    conn1.name(globalNum, table);
    this.conn.push(conn1);

    const conn2 = new Connection(newNode.n, conn.out);
    conn2.weight = conn.weight;
    conn2.name(globalNum, table);
    this.conn.push(conn2);

    this.reorganize(allowRecurrent);
    return true;
  }

  mutateConn(i, allowRecurrent) {
    const victim = this.conn[i];
    const roll = Math.random();
    if(roll < .9) {
      victim.weight += Math.random() * 2 - 1;
    } else if(roll < .999) {
      victim.weight = Math.random() * 2 - 1;
    } else {
      if(victim.rec && !allowRecurrent) {
        return;
      }
      victim.enabled = !victim.enabled;
    }
  }

  reorganize(allowRecurrent) {
    const inp = [];
    const end = [];
    const mid = [[]];
    for(let i = 0; i < this.nodes.length; i++) {
      const node = this.nodes[i];
      if(node.type == 'inp' || node.type == 'bias') {
        inp.push(node);
      } else if(node.type == 'out') {
        end.push(node);
      } else {
        let search = [i + 1];
        let depth = -2;
        const seen = {};
        while(search.length > 0) {
          const temp = [];
          for(let j = 0; j < search.length; j++) {
            let curNode = search[j];
            if(seen[curNode] || this.nodes[curNode - 1].type == 'inp' || this.nodes[curNode - 1].type == 'bias') {
              continue;
            }
            seen[curNode] = true;
            for(let k = 0; k < this.conn.length; k++) {
              let conn = this.conn[k];
              if(conn.rec) {
                continue;
              }
              if(conn.out == curNode) {
                temp.push(conn.in);
              }
            }
          }
          search = temp;
          depth++;
        }
        while(mid.length < depth + 1) {
          mid.push([]);
        }

        //Error happens when there is no path back to inp. This Occurs when
        //a child is made, with a node's input being excess while the output
        //is disjoint, resulting in the creation of a node with no way back.
        //In this case, it is just left in the first layer, until it evolves
        //a connection.
        try {
          mid[depth].push(node);
        } catch {
          mid[0].push(node);
        }

      }
    }
    mid.unshift(inp);
    mid.push(end);
    this.struct = mid;
    this.updateConn(allowRecurrent);
  }

  updateConn(allowRecurrent) {
    for(let i = 0; i < this.conn.length; i++) {
      const conn = this.conn[i];
      const pos1 = this.findNodePos(conn.in);
      const pos2 = this.findNodePos(conn.out);
      if(pos1[0] == pos2[0]) {
        conn.enabled = false;
      }
      if(pos2[0] < pos1[0] && !allowRecurrent) {
        conn.enabled = false;
      }
    }
  }

  mutate(globalNum, table, allowRecurrent) {
    if(Math.random() < .8) {
      for(let i = 0; i < this.conn.length; i++) {
        this.mutateConn(i, allowRecurrent);
      }
    }
    if(Math.random() < .05) {
      this.addConn(globalNum, table, allowRecurrent);
    }
    if(Math.random() < .03) {
      this.addNode(globalNum, table, allowRecurrent);
    }
  }

  makeChild(parent) {
    this.conn.sort((a, b) => {
      return a.n - b.n;
    });
    parent.conn.sort((a, b) => {
      return a.n - b.n;
    });
    const child = new Net(this.numIn, this.numOut);
    let p1 = 0;
    let p2 = 0;
    while(p1 < this.conn.length) {
      if(p2 >= parent.conn.length) {
        while(p1 < this.conn.length) {
          child.conn.push(this.conn[p1].copy());
          p1++;
        }
        break;
      }
      const n1 = this.conn[p1].n;
      const n2 = parent.conn[p2].n;
      if(n1 == n2) {
        if(Math.random() < .5) {
          child.conn.push(this.conn[p1].copy());
        } else {
          child.conn.push(parent.conn[p2].copy());
        }
        p1++;
        p2++;
      } else if(n1 > n2) {
        child.conn.push(parent.conn[p2].copy());
        p2++;
      } else {
        child.conn.push(this.conn[p1].copy());
        p1++;
      }
    }
    for(let i = 0; i < child.conn.length; i++) {
      while(child.conn[i].in > child.nodes.length) {
        child.nodes.push(new Node(child.nodes.length + 1, 'hid'));
      }
      while(child.conn[i].out > child.nodes.length) {
        child.nodes.push(new Node(child.nodes.length + 1, 'hid'));
      }
    }
    child.reorganize();
    return child;
  }

  checkDistance(net, c1, c2, c3) {
    const n = Math.ceil(max(max(this.conn.length, net.conn.length), 1) / 20);
    this.conn.sort((a, b) => {
      return a.n - b.n;
    });
    net.conn.sort((a, b) => {
      return a.n - b.n;
    });
    let d = 0;
    let total = 0;
    let sum = 0;
    let p1 = 0;
    let p2 = 0;
    while(p1 < this.conn.length && p2 < net.conn.length) {
      const n1 = this.conn[p1].n;
      const n2 = net.conn[p2].n;
      if(n1 == n2) {
        sum += Math.abs(this.conn[p1].weight - net.conn[p2].weight);
        total++;
        p1++;
        p2++;
      } else if(n1 < n2) {
        d++;
        p1++;
      } else {
        d++;
        p2++;
      }
    }
    const e = max(0, this.conn.length - p1 - 1) + max(0, net.conn.length  - p2 - 1);
    const w = sum / max(total, 1);
    return ((c1 * e) / n) + ((c2 * d) / n) + (c3 * w);
  }
}

class Node {
  constructor(n, type) {
    this.n = n;
    this.type = type;
    this.out = 0;
    if(this.type == 'bias') {
      this.out = 1;
    }
  }

  pass(inp) {
    if(this.type == 'bias') {
      return;
    }
    let sum = 0;
    for(let i = 0; i < inp.length; i++) {
      sum += inp[i];
    }
    this.out = sigmoid(sum);
  }

  copy() {
    const copy = new Node(this.n, this.type);
    return copy;
  }
}

class Connection {
  constructor(inp, out) {
    this.in = inp;
    this.out = out;
    this.weight = Math.random() * 2 - 1;
    this.n;
    this.enabled = true;
    this.rec = false;
  }

  name(globalNum, table) {
    const key = String(this.in) + ',' + String(this.out);
    if(table[key]) {
      this.n = table[key];
    } else {
      this.n = globalNum[0];
      table[key] = globalNum[0];
      globalNum[0] += 1;
    }
  }

  copy() {
    const copy = new Connection(this.in, this.out);
    copy.weight = this.weight;
    copy.n = this.n;
    copy.enabled = this.enabled;
    copy.rec = this.rec;
    return copy;
  }
}
