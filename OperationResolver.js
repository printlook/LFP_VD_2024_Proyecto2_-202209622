class OperationResolver {
  constructor(ast) {
    this.ast = ast;
    this.results = [];
    this.errors = [];
    this.logs = [];
  }

  resolve() {
    if (!this.ast || !this.ast.operaciones) {
      this.errors.push("El AST no contiene operaciones válidas.");
      return { results: this.results, errors: this.errors, logs: this.logs };
    }

    for (const operacion of this.ast.operaciones) {
      const result = this.resolveOperation(operacion);
      if (result !== null) {
        this.results.push({
          operacion: operacion.operacion,
          valor1: operacion.valor1,
          valor2: operacion.valor2,
          resultado: result,
        });
      }
    }

    return { results: this.results, errors: this.errors, logs: this.logs };
  }

  resolveOperation(operation) {
    const { operacion, valor1, valor2 } = operation;

    const resolveValue = (value) => {
      if (value === undefined || value === null) {
        return null;
      }
      if (typeof value === "number") {
        return value;
      } else if (Array.isArray(value)) {
        if (value.length === 1) {
          return this.resolveOperation(value[0]);
        } else {
          this.errors.push("Las listas deben contener exactamente una operación válida.");
          return null;
        }
      } else if (typeof value === "object") {
        return this.resolveOperation(value);
      } else {
        this.errors.push(`Valor inválido: ${value}`);
        return null;
      }
    };

    // Resolver valores antes de operar
    const v1 = resolveValue(valor1);
    const v2 = resolveValue(valor2);

    if (v1 === null && !["inverso", "seno", "coseno", "tangente"].includes(operacion)) {
      this.errors.push(`Falta un valor válido para la operación ${operacion}.`);
      return null;
    }

    if (v2 === null && ["suma", "resta", "multiplicacion", "division", "potencia", "mod", "raiz"].includes(operacion)) {
      this.errors.push(`Falta un segundo valor válido para la operación ${operacion}.`);
      return null;
    }

    try {
      switch (operacion) {
        case "suma":
          return v1 + v2;
        case "resta":
          return v1 - v2;
        case "multiplicacion":
          return v1 * v2;
        case "division":
          if (v2 === 0 || v2 === null) {
            this.errors.push("División por cero o valor inválido.");
            return null;
          }
          return v1 / v2;
        case "potencia":
          return Math.pow(v1, v2);
        case "raiz":
          if (v1 === null || v1 < 0 || v2 === null || v2 <= 0) {
            this.errors.push("Índice de raíz o valor inválido.");
            return null;
          }
          return Math.pow(v1, 1 / v2);
        case "seno":
          return Math.sin((v1 * Math.PI) / 180);
        case "coseno":
          return Math.cos((v1 * Math.PI) / 180);
        case "tangente":
          return Math.tan((v1 * Math.PI) / 180);
        case "mod":
          if (v2 === 0 || v2 === null) {
            this.errors.push("Módulo por cero o valor inválido.");
            return null;
          }
          return v1 % v2;
        case "inverso":
          return v1 !== 0 ? 1 / v1 : (this.errors.push("Inverso de cero no permitido."), null);
        default:
          this.errors.push(`Operación desconocida: ${operacion}`);
          return null;
      }
    } catch (error) {
      this.errors.push(`Error al ejecutar operación ${operacion}: ${error.message}`);
      return null;
    }
  }

  // Funciones para el registro y resultados
  imprimir(cadena) {
    const log = { accion: "imprimir", mensaje: cadena };
    this.logs.push(log);
  }

  conteo() {
    const log = { accion: "conteo", total: this.results.length };
    this.logs.push(log);
    return this.results.length;
  }

  promedio(tipoOperacion) {
    const resultados = this.results.filter((r) => r.operacion === tipoOperacion).map((r) => r.resultado);
    if (resultados.length === 0) {
      const log = { accion: "promedio", operacion: tipoOperacion, mensaje: "No se encontraron operaciones." };
      this.logs.push(log);
      return null;
    }
    const promedio = resultados.reduce((acc, curr) => acc + curr, 0) / resultados.length;
    const log = { accion: "promedio", operacion: tipoOperacion, promedio: promedio };
    this.logs.push(log);
    return promedio;
  }

  max(tipoOperacion) {
    const resultados = this.results.filter((r) => r.operacion === tipoOperacion).map((r) => r.resultado);
    if (resultados.length === 0) {
      const log = { accion: "max", operacion: tipoOperacion, mensaje: "No se encontraron operaciones." };
      this.logs.push(log);
      return null;
    }
    const maximo = Math.max(...resultados);
    const log = { accion: "max", operacion: tipoOperacion, maximo: maximo };
    this.logs.push(log);
    return maximo;
  }

  min(tipoOperacion) {
    const resultados = this.results.filter((r) => r.operacion === tipoOperacion).map((r) => r.resultado);
    if (resultados.length === 0) {
      const log = { accion: "min", operacion: tipoOperacion, mensaje: "No se encontraron operaciones." };
      this.logs.push(log);
      return null;
    }
    const minimo = Math.min(...resultados);
    const log = { accion: "min", operacion: tipoOperacion, minimo: minimo };
    this.logs.push(log);
    return minimo;
  }

  generarReporte(tipo, extra = null) {
    let log;
    switch (tipo) {
      case "tokens":
        log = { accion: "reporte", tipo: "tokens", contenido: this.ast.tokens || [] };
        break;
      case "errores":
        log = { accion: "reporte", tipo: "errores", extra: extra || "Sin información adicional", contenido: this.errors };
        break;
      case "arbol":
        log = { accion: "reporte", tipo: "arbol", extra: extra || "Sin derivación", contenido: this.ast };
        break;
      default:
        log = { accion: "reporte", tipo: tipo, mensaje: "Tipo de reporte desconocido." };
    }
    this.logs.push(log);
  }

  generateGraphvizDiagram(config = { fondo: "#FFFFFF", fuente: "#000000", forma: "ellipse", tipoFuente: "Arial" }) {
    let graph = `digraph G {\n`;
    graph += `node [shape=${config.forma}, style=filled, fillcolor="${config.fondo}", fontcolor="${config.fuente}", fontname="${config.tipoFuente}"];\n`;
  
    this.results.forEach((result, index) => {
      const nodeId = `op${index}`;
      graph += `${nodeId} [label="Operación: ${result.operacion}\\nResultado: ${result.resultado}", shape=ellipse];\n`;
  
      if (result.valor1 !== undefined) {
        const valor1Id = `${nodeId}_v1`;
        graph += `${valor1Id} [label="Valor1: ${result.valor1}", shape=box];\n`;
        graph += `${nodeId} -> ${valor1Id};\n`;
      }
  
      if (result.valor2 !== undefined) {
        const valor2Id = `${nodeId}_v2`;
        graph += `${valor2Id} [label="Valor2: ${result.valor2}", shape=box];\n`;
        graph += `${nodeId} -> ${valor2Id};\n`;
      }
    });
  
    graph += "}";
    return graph;
  }
}
export default OperationResolver;
