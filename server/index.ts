interface cellIn {
  x: string,
  y: string,
  in: string,
}

interface cellOut {
  x: string;
  y: string;
  in: string;
  out: string;
}

// y -> x -> value
const sheets = new Map<string, Map<string, string>>();

const server = Bun.serve({
  fetch(req, server) {
    const success = server.upgrade(req);
    if (!success) {
      return new Response("Not found", { status: 404 });
    }
    return undefined;
  },
  websocket: {
    message(ws, message) {
      const req = JSON.parse(message.toString()) as cellIn;
      if (!sheets.has(req.y)) {
        sheets.set(req.y, new Map());
      }
      sheets.get(req.y)?.set(req.x, req.in);

      const out: cellOut = {
        x: req.x,
        y: req.y,
        in: req.in,
        out: calculate(req.in),
      }

      console.log(sheets);

      ws.send(JSON.stringify(out));
    }
  }
})

type method = "+" | "-" | "*" | "/" | "ref";

const calculate = (value: string): string => {
  if (!value.startsWith('=@')) {
    return value;
  }

  // =@ からはじまっているもの。
  let nonEqual = value.slice(2).trim(); // (method arg1 arg2 ... ) の形式 

  const _innerCalculate = (value: string): string | undefined => {
    if (!value.startsWith('(') && !value.endsWith(')')) {
      return value;
    }

    let splitted = value.slice(1, value.length - 1).split(' ');
    let isS: boolean = false;
    let tmp: string[] = [];
    const args: string[] = [];
    splitted.forEach((v) => {
      if (v.startsWith('(')) {
        isS = true;
        tmp.push(v);
      } else if (v.endsWith(')')) {
        isS = false;
        tmp.push(v);
        args.push(tmp.join(' '));
        tmp = [];
      } else {
        if (isS) {
          tmp.push(v);
        } else {
          args.push(v);
        }
      }
    })

    if (args.length === 0) {
      return undefined;
    }

    console.log(args);

    const method = args.shift();
    if (method === 'ref') {
      return calculate(sheets.get(args[0])?.get(args[1]) ?? '');
    } else if (method === '+') {
      return args.map(arg => _innerCalculate(arg) ?? '').filter(arg => arg !== undefined).reduce((arg1, arg2) => String(parseFloat(arg1) + parseFloat(arg2)));
    } else if (method === '-') {
      return args.map(arg => _innerCalculate(arg) ?? '').filter(arg => arg !== undefined).reduce((arg1, arg2) => String(parseFloat(arg1) - parseFloat(arg2)));
    } else if (method === '*') {
      return args.map(arg => _innerCalculate(arg) ?? '').filter(arg => arg !== undefined).reduce((arg1, arg2) => String(parseFloat(arg1) * parseFloat(arg2)));
    } else if (method === '/') {
      return args.map(arg => _innerCalculate(arg) ?? '').filter(arg => arg !== undefined).reduce((arg1, arg2) => String(parseFloat(arg1) / parseFloat(arg2)));
    }
  }

  const innerValue = _innerCalculate(nonEqual);
  if (innerValue) {
    return innerValue;
      
  } // (method arg1 arg2 ...) 形式のものを受け付ける
  
  return value;
}

console.log(`Listening on ${server.port}`)
