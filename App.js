
import OperationResolver from './OperationResolver';
import React, { useState } from 'react';
import './App.css';
import Viz from "viz.js";
import { Module, render } from "viz.js/full.render.js";
// Analizador Léxico
class Lexer {
  constructor(input) {
    this.input = input;
    this.position = 0;
    this.currentChar = this.input[this.position];
    this.tokens = [];
    this.errors = [];
    this.line = 1;
    this.column = 1;
  }

  advance() {
    if (this.currentChar === '\n') {
      this.line++;
      this.column = 0;
    }
    this.position++;
    this.currentChar = this.position < this.input.length ? this.input[this.position] : null;
    this.column++;
  }

  skipWhitespace() {
    while (this.currentChar && /\s/.test(this.currentChar)) {
      this.advance();
    }
  }

  skipComment() {
    if (this.currentChar === '/' && this.peek() === '/') {
      while (this.currentChar && this.currentChar !== '\n') {
        this.advance();
      }
    } else if (this.currentChar === '/' && this.peek() === '*') {
      this.advance();
      this.advance();
      while (this.currentChar && !(this.currentChar === '*' && this.peek() === '/')) {
        this.advance();
      }
      this.advance();
      this.advance();
    }
  }

  peek() {
    const nextPosition = this.position + 1;
    return nextPosition < this.input.length ? this.input[nextPosition] : null;
  }

  lexNumber() {
    let number = '';
    while (this.currentChar && /[0-9.]/.test(this.currentChar)) {
      number += this.currentChar;
      this.advance();
    }
    this.tokens.push({
      type: 'NUMBER',
      value: parseFloat(number),
      line: this.line,
      column: this.column,
    });
  }

  lexWord() {
    let word = '';
    while (this.currentChar && /[a-zA-Z]/.test(this.currentChar)) {
      word += this.currentChar;
      this.advance();
    }
    const keywords = ['operacion', 'nombre', 'valor1', 'valor2', 'ConfiguracionesLex', 'ConfiguracionesParser', 'fondo', 'fuente', 'forma', 'tipoFuente'];
    const operations = ['suma', 'resta', 'multiplicacion', 'division', 'potencia', 'raiz', 'seno', 'coseno', 'tangente', 'mod'];

    if (keywords.includes(word)) {
      this.tokens.push({
        type: 'KEYWORD',
        value: word,
        line: this.line,
        column: this.column,
      });
    } else if (operations.includes(word)) {
      this.tokens.push({
        type: 'OPERATION',
        value: word,
        line: this.line,
        column: this.column,
      });
    } else {
      this.tokens.push({
        type: 'IDENTIFIER',
        value: word,
        line: this.line,
        column: this.column,
      });
    }
  }

  lexString() {
    let string = '';
    this.advance();
    while (this.currentChar && this.currentChar !== '"') {
      string += this.currentChar;
      this.advance();
    }
    if (this.currentChar === '"') {
      this.advance();
      this.tokens.push({
        type: 'STRING',
        value: string,
        line: this.line,
        column: this.column,
      });
    } else {
      this.errors.push({
        type: 'UNCLOSED_STRING',
        value: string,
        line: this.line,
        column: this.column,
      });
    }
  }

  lexSymbol() {
    const symbols = {
      '=': 'ASSIGN',
      '{': 'LBRACE',
      '}': 'RBRACE',
      '[': 'LBRACKET',
      ']': 'RBRACKET',
      ':': 'COLON',
      ',': 'COMMA',
      '(': 'LPAREN',
      ')': 'RPAREN',
    };

    if (symbols[this.currentChar]) {
      this.tokens.push({
        type: symbols[this.currentChar],
        value: this.currentChar,
        line: this.line,
        column: this.column,
      });
      this.advance();
    } else {
      this.errors.push({
        type: 'INVALID_SYMBOL',
        value: this.currentChar,
        line: this.line,
        column: this.column,
      });
      this.advance();
    }
  }

  tokenize() {
    while (this.currentChar) {
      if (/\s/.test(this.currentChar)) {
        this.skipWhitespace();
      } else if (this.currentChar === '/' && (this.peek() === '/' || this.peek() === '*')) {
        this.skipComment();
      } else if (/[a-zA-Z]/.test(this.currentChar)) {
        this.lexWord();
      } else if (/[0-9.]/.test(this.currentChar)) {
        this.lexNumber();
      } else if (this.currentChar === '"') {
        this.lexString();
      } else {
        this.lexSymbol();
      }
    }
    return { tokens: this.tokens, errors: this.errors };
  }
}

// Analizador Sintáctico

class SyntacticAnalyzer {
  constructor(tokens) {
    this.tokens = tokens;
    this.current = 0;
    this.errors = [];
    this.ast = {
      operaciones: [],
      configuracionesLex: [],
      configuracionesParser: [],
      instrucciones: []
    };
  }

  peek() {
    return this.current + 1 < this.tokens.length ? this.tokens[this.current + 1] : null;
  }

  siguiente() {
    return this.current < this.tokens.length ? this.tokens[this.current] : null;
  }

  avanzar() {
    const token = this.siguiente();
    this.current++;
    return token;
  }

  retroceder() {
    this.current--;
  }

  esFinal() {
    return this.current >= this.tokens.length;
  }

  verificarTipo(type) {
    const token = this.siguiente();
    if (!token) return false;
    
    // Acepta STRING como identificador válido para ciertos casos
    if (type === 'IDENTIFIER' && token.type === 'STRING') {
      return true;
    }
    return token.type === type;
  }

  registrarError(mensaje, token) {
    if (token) {
      this.errors.push({
        tipo: 'ERROR_SINTACTICO',
        mensaje,
        linea: token.line || 0,
        columna: token.column || 0,
        valor: token.value || ''
      });
    }
  }

  analizar() {
    while (!this.esFinal()) {
      const token = this.siguiente();

      if (!token) break;

      if (token.type === 'COMMENT_LINE' || token.type === 'COMMENT_BLOCK') {
        this.avanzar();
        continue;
      }

      if (token.type === 'IDENTIFIER' || token.type === 'STRING') {
        switch (token.value) {
          case 'Operaciones':
            this.analizarOperaciones();
            break;
          case 'ConfiguracionesLex':
            this.analizarConfiguracion('ConfiguracionesLex');
            break;
          case 'ConfiguracionesParser':
            this.analizarConfiguracion('ConfiguracionesParser');
            break;
          case 'imprimir':
          case 'conteo':
          case 'promedio':
          case 'max':
          case 'min':
          case 'generarReporte':
            this.analizarFuncion();
            break;
          default:
            this.registrarError(`Token inesperado: ${token.value}`, token);
            this.avanzar();
        }
      } else {
        this.registrarError(`Token inesperado: ${token.value}`, token);
        this.avanzar();
      }
    }

    return { ast: this.ast, errors: this.errors };
  }

  analizarConfiguracion(tipo) {
    this.avanzar();

    if (!this.verificarTipo('ASSIGN')) {
      this.registrarError(`Se esperaba '=' después de ${tipo}`, this.siguiente());
      return;
    }
    this.avanzar();

    if (!this.verificarTipo('LBRACKET')) {
      this.registrarError(`Se esperaba '[' después del '='`, this.siguiente());
      return;
    }
    this.avanzar();

    const config = {};
    let expectingKey = true;

    while (!this.verificarTipo('RBRACKET') && !this.esFinal()) {
      if (expectingKey) {
        if (!this.verificarTipo('IDENTIFIER') && !this.verificarTipo('STRING')) {
          this.registrarError('Se esperaba un identificador de configuración', this.siguiente());
          break;
        }
        const clave = this.avanzar();
        
        if (!this.verificarTipo('COLON')) {
          this.registrarError("Se esperaba ':' después de la clave", this.siguiente());
          break;
        }
        this.avanzar();
        
        if (!this.verificarTipo('STRING') && !this.verificarTipo('COLOR')) {
          this.registrarError('Se esperaba un valor de configuración válido', this.siguiente());
          break;
        }
        const valor = this.avanzar();
        config[clave.value] = valor.value;
        expectingKey = false;
      } else if (this.verificarTipo('COMMA')) {
        this.avanzar();
        expectingKey = true;
      } else {
        this.registrarError("Se esperaba ',' o ']'", this.siguiente());
        break;
      }
    }

    if (!this.verificarTipo('RBRACKET')) {
      this.registrarError("Se esperaba ']' para cerrar la configuración", this.siguiente());
      return;
    }
    this.avanzar();

    this.ast[tipo.toLowerCase()] = config;
  }

  analizarOperacion() {
    if (!this.verificarTipo('LBRACE')) {
      this.registrarError("Se esperaba '{' para iniciar una operación", this.siguiente());
      return null;
    }
    this.avanzar();

    const operacion = {};
    let expectingKey = true;
    let llavesCerradas = false;

    while (!this.esFinal() && !llavesCerradas) {
      if (expectingKey) {
        if (!this.verificarTipo('IDENTIFIER') && !this.verificarTipo('STRING')) {
          this.registrarError('Se esperaba una clave de operación', this.siguiente());
          break;
        }
        const clave = this.avanzar();

        if (!this.verificarTipo('COLON')) {
          this.registrarError("Se esperaba ':' después de la clave", this.siguiente());
          break;
        }
        this.avanzar();

        const valor = this.analizarValorOperacion();
        if (valor !== null) {
          operacion[clave.value] = valor;
        } else {
          this.registrarError('Valor de operación inválido', this.siguiente());
          break;
        }
        expectingKey = false;
      } else if (this.verificarTipo('COMMA')) {
        this.avanzar();
        expectingKey = true;
      } else if (this.verificarTipo('RBRACE')) {
        this.avanzar();
        llavesCerradas = true;
      } else {
        this.registrarError("Se esperaba ',' o '}'", this.siguiente());
        break;
      }
    }

    if (!llavesCerradas) {
      this.registrarError("Se esperaba '}' para cerrar la operación", this.siguiente());
      return null;
    }

    return operacion;
  }

  analizarValorOperacion() {
    if (this.verificarTipo('NUMBER')) {
      return this.avanzar().value;
    }
    
    if (this.verificarTipo('STRING')) {
      return this.avanzar().value;
    }
    
    if (this.verificarTipo('LBRACKET')) {
      this.avanzar();
      const operacionAnidada = this.analizarOperacion();
      
      if (!this.verificarTipo('RBRACKET')) {
        this.registrarError("Se esperaba ']' para cerrar la operación anidada", this.siguiente());
        return null;
      }
      this.avanzar();
      return operacionAnidada;
    }
    
    return null;
  }

  analizarOperaciones() {
    this.avanzar();

    if (!this.verificarTipo('ASSIGN')) {
      this.registrarError("Se esperaba '=' después de 'Operaciones'", this.siguiente());
      return;
    }
    this.avanzar();

    if (!this.verificarTipo('LBRACKET')) {
      this.registrarError("Se esperaba '[' después del '='", this.siguiente());
      return;
    }
    this.avanzar();

    let expectingOperation = true;
    while (!this.verificarTipo('RBRACKET') && !this.esFinal()) {
      if (expectingOperation) {
        const operacion = this.analizarOperacion();
        if (operacion) {
          this.ast.operaciones.push(operacion);
          expectingOperation = false;
        } else {
          break;
        }
      } else if (this.verificarTipo('COMMA')) {
        this.avanzar();
        expectingOperation = true;
      } else {
        this.registrarError("Se esperaba ',' o ']'", this.siguiente());
        break;
      }
    }

    if (!this.verificarTipo('RBRACKET')) {
      this.registrarError("Se esperaba ']' para cerrar las operaciones", this.siguiente());
      return;
    }
    this.avanzar();
  }

  analizarFuncion() {
    const funcionToken = this.avanzar();
    const funcionNode = {
      tipo: funcionToken.value,
      argumentos: []
    };

    if (!this.verificarTipo('LPAREN')) {
      this.registrarError(`Se esperaba '(' después de ${funcionToken.value}`, this.siguiente());
      return;
    }
    this.avanzar();

    let expectingArg = true;
    while (!this.verificarTipo('RPAREN') && !this.esFinal()) {
      if (expectingArg) {
        if (this.verificarTipo('STRING') || this.verificarTipo('NUMBER')) {
          funcionNode.argumentos.push(this.avanzar().value);
          expectingArg = false;
        } else {
          this.registrarError('Se esperaba un argumento válido', this.siguiente());
          break;
        }
      } else if (this.verificarTipo('COMMA')) {
        this.avanzar();
        expectingArg = true;
      } else {
        this.registrarError("Se esperaba ',' o ')'", this.siguiente());
        break;
      }
    }

    if (!this.verificarTipo('RPAREN')) {
      this.registrarError(`Se esperaba ')' para cerrar la función`, this.siguiente());
      return;
    }
    this.avanzar();

    this.ast.instrucciones.push(funcionNode);
  }
}

function App() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState({
    tokens: [],
    lexicalErrors: [],
    ast: {},
    syntacticErrors: [],
    calculationResults: [],
    calculationErrors: [],
    dotDiagram: "",
    svgDiagram: ""
  });

  const handleAnalyze = () => {
    const lexer = new Lexer(input);
    const lexResult = lexer.tokenize();

    const syntacticAnalyzer = new SyntacticAnalyzer(lexResult.tokens);
    const syntacticResult = syntacticAnalyzer.analizar();

    setOutput({
      tokens: lexResult.tokens,
      lexicalErrors: lexResult.errors,
      ast: syntacticResult.ast,
      syntacticErrors: syntacticResult.errors,
      calculationResults: [],
      calculationErrors: [],
      dotDiagram: "",
      svgDiagram: ""
    });
  };

  const handleResolve = () => {
    if (!output.ast || !output.ast.operaciones) {
      setOutput((prev) => ({
        ...prev,
        calculationResults: [],
        calculationErrors: ['No hay operaciones para resolver.']
      }));
      return;
    }

    const resolver = new OperationResolver(output.ast);
    const result = resolver.resolve();
    const dotDiagram = resolver.generateGraphvizDiagram({
      fondo: "#D3D3D3",
      fuente: "#000000",
      forma: "ellipse",
      tipoFuente: "Arial"
    });

    if (!dotDiagram) {
      setOutput((prev) => ({
        ...prev,
        calculationErrors: [...prev.calculationErrors, "Error al generar el diagrama DOT."]
      }));
      return;
    }

    // Generar SVG con Viz.js
    const viz = new Viz({ Module, render });

    viz.renderSVGElement(dotDiagram)
      .then((svgElement) => {
        setOutput((prev) => ({
          ...prev,
          calculationResults: result.results,
          calculationErrors: result.errors,
          dotDiagram,
          svgDiagram: svgElement.outerHTML // SVG como string para mostrar en el frontend
        }));
      })
      .catch((error) => {
        console.error("Error al generar SVG:", error);
        setOutput((prev) => ({
          ...prev,
          calculationErrors: [...prev.calculationErrors, "Error al generar diagrama SVG."]
        }));
      });

    // Descargar archivo DOT automáticamente
    const blob = new Blob([dotDiagram], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "diagram.dot";
    link.click();
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => setInput(e.target.result);
      reader.readAsText(file);
    }
  };

  const handleClear = () => {
    setInput('');
    setOutput({
      tokens: [],
      lexicalErrors: [],
      ast: {},
      syntacticErrors: [],
      calculationResults: [],
      calculationErrors: [],
      dotDiagram: "",
      svgDiagram: ""
    });
  };

  const handleSave = () => {
    const blob = new Blob([input], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'analyzed_code.nlex';
    link.click();
  };

  const handleSaveAs = () => {
    const fileName = prompt('Ingrese el nombre del archivo:', 'analyzed_code.nlex');
    if (fileName) {
      const blob = new Blob([input], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();
    }
  };

  const renderErrors = (errors, title) => (
    <div className="error-section">
      <h2>{title}</h2>
      {errors.length === 0 ? (
        <p className="no-errors">No se encontraron errores</p>
      ) : (
        <div className="error-list">
          {errors.map((error, index) => (
            <div key={index} className="error-item">
              <span className="error-location">
                Línea {error.linea || error.line}, Columna {error.columna || error.column}:
              </span>
              <span className="error-message">
                {error.mensaje || `Error en token "${error.value}"`}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm p-6">
        <h1 className="text-3xl font-bold text-gray-900">NodeLex v2.0</h1>
        <p className="text-gray-600">Un analizador léxico y sintáctico con capacidades de cálculo</p>
      </header>

      <main className="container mx-auto p-6">
        <div className="grid gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Escribe o carga un archivo .nlex"
              className="w-full h-64 p-4 border rounded-lg"
            />

            <div className="mt-4 flex gap-4">
              <input
                type="file"
                onChange={handleFileUpload}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              <button
                onClick={handleAnalyze}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Analizar
              </button>
              <button
                onClick={handleResolve}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
              >
                Resolver Operaciones
              </button>
              <button
                onClick={handleClear}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                Limpiar
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Guardar
              </button>
              <button
                onClick={handleSaveAs}
                className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700"
              >
                Guardar como
              </button>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Tokens</h2>
              <pre className="bg-gray-50 p-4 rounded-lg overflow-auto max-h-96">
                {JSON.stringify(output.tokens, null, 2)}
              </pre>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">AST</h2>
              <pre className="bg-gray-50 p-4 rounded-lg overflow-auto max-h-96">
                {JSON.stringify(output.ast, null, 2)}
              </pre>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Resultados de las Operaciones</h2>
              {output.calculationErrors.length > 0 && (
                <div className="error-list">
                  {output.calculationErrors.map((error, index) => (
                    <div key={index} className="error-item text-red-600">
                      {error}
                    </div>
                  ))}
                </div>
              )}
              <pre className="bg-gray-50 p-4 rounded-lg overflow-auto max-h-96">
                {JSON.stringify(output.calculationResults, null, 2)}
              </pre>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Diagrama Generado</h2>
              <div id="diagram-container">
                {output.svgDiagram ? (
                  <div dangerouslySetInnerHTML={{ __html: output.svgDiagram }} />
                ) : (
                  <p>No se ha generado ningún diagrama.</p>
                )}
              </div>
            </div>

            {renderErrors(output.lexicalErrors, "Errores Léxicos")}
            {renderErrors(output.syntacticErrors, "Errores Sintácticos")}
          </div>
        </div>
      </main>

      <footer className="bg-white mt-8 py-4 text-center">
        <p className="text-gray-600">© 2024 NodeLex. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
}

export default App;
