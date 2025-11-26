const { Engine } = require('../js/core/engine.core.js');
require('../js/core/engine.extensions.js');
const { ImportText } = require('../js/features/importtext.js');
const { DataTesauro } = require('../js/features/datatesauro.js');

describe('Engine export/import JSON', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="nodesContainer"></div>';
    global.URL.createObjectURL = jest.fn(() => 'blob:mock');
    global.URL.revokeObjectURL = jest.fn();
  });

  test('exportToJSON serializes full diagram and triggers download', async () => {
    const originalCreateElement = document.createElement.bind(document);
    const anchor = { click: jest.fn() };
    jest.spyOn(document, 'createElement').mockImplementation((tag) => {
      if (tag === 'a') return anchor;
      return originalCreateElement(tag);
    });

    Engine.fichaProyecto = { procedimiento: 'Prueba', actividad: 'Act', descripcion: 'Desc' };
    Engine.tesauro = [{ ref: 'R1', nombre: 'Campo', tipo: 'texto' }];
    Engine.data = {
      nodos: [{ id: 'n1', tipo: 'formulario', titulo: 'A', x: 1, y: 2, width: 3, height: 4 }],
      conexiones: [{ id: 'c1', from: 'n1', to: 'n1', fromPos: 'right', toPos: 'left' }]
    };

    Engine.exportToJSON();

    const blob = global.URL.createObjectURL.mock.calls[0][0];
    const json = JSON.parse(await blob.text());
    expect(json.fichaProyecto.procedimiento).toBe('Prueba');
    expect(json.nodos[0].id).toBe('n1');
    expect(anchor.download).toContain('Proceso - Prueba -');
  });

  test('importFromJSON rebuilds data and UI scaffolding', () => {
    document.body.innerHTML = [
      '<div id="projectTitle"></div>',
      '<div id="canvasArea" style="width:800px; height:600px;"></div>',
      '<div id="nodesContainer"></div>',
      '<svg id="svgConnections"></svg>'
    ].join('');

    global.Renderer = {
      init: jest.fn(),
      clearAll: jest.fn(),
      renderNode: jest.fn(),
      drawConnection: jest.fn(),
      redrawConnections: jest.fn(),
      container: null,
      svg: null
    };
    global.UI = { updateAsignacionesList: jest.fn(), clear: jest.fn() };
    global.DataTesauro = { campos: [], render: jest.fn() };
    Engine.saveHistory = jest.fn();
    Engine.asignaciones = { grupos: new Set(), usuarios: new Set() };

    const payload = {
      fichaProyecto: { procedimiento: 'Demo', actividad: 'Act', descripcion: 'Desc', entidad: 'Ent' },
      tesauro: [{ ref: 'RZ', nombre: 'Zona', tipo: 'texto' }],
      asignaciones: { grupos: ['G1'], usuarios: ['U1'] },
      nodos: [{ id: 'n10', tipo: 'formulario', titulo: 'Uno', x: 10, y: 20, width: 100, height: 80 }],
      conexiones: [{ id: 'c10', from: 'n10', to: 'n10', fromPos: 'right', toPos: 'left' }]
    };

    Engine.importFromJSON(JSON.stringify(payload));

    expect(Engine.data.nodos).toHaveLength(1);
    expect(Engine.data.conexiones[0].id).toBe('c10');
    expect(Engine.tesauro[0].ref).toBe('RZ');
    expect(Engine.asignaciones.grupos.has('G1')).toBe(true);
    expect(global.Renderer.renderNode).toHaveBeenCalled();
  });
});

describe('ImportText import from clipboard-like text', () => {
  test('creates nodes and connections from structured lines', () => {
    const originalEngine = global.Engine;
    const nodes = [];
    const conexiones = [];

    global.Engine = {
      data: { nodos: nodes, conexiones },
      createNode: jest.fn((tipo) => {
        const nodo = { id: `n${nodes.length + 1}`, tipo, titulo: tipo, x: 0, y: 0, width: 100, height: 60 };
        nodes.push(nodo);
        return nodo;
      }),
      getNode: (id) => nodes.find((n) => n.id === id),
      createConnection: jest.fn((from, to, fromPos, toPos) => {
        const conn = { id: `c${conexiones.length + 1}`, from, to, fromPos, toPos };
        conexiones.push(conn);
        return conn;
      }),
      updateConnectionCondition: jest.fn(),
      updateConnectionCambioEstado: jest.fn(),
      saveHistory: jest.fn()
    };

    global.Renderer = {
      clearAll: jest.fn(),
      renderNode: jest.fn(),
      redrawConnections: jest.fn()
    };

    document.body.innerHTML = [
      '<div id="canvasArea" style="width:800px; height:600px;"></div>',
      '<div id="nodesContainer"></div>',
      '<svg id="svgConnections"></svg>'
    ].join('');

    const text = ['Tarea origen', '\tLanzar tarea Tarea destino', 'Tarea destino'].join('\n');
    ImportText.import(text);

    expect(nodes).toHaveLength(2);
    expect(conexiones).toHaveLength(1);
    expect(conexiones[0].from).toBe(nodes[0].id);
    expect(conexiones[0].to).toBe(nodes[1].id);

    global.Engine = originalEngine;
  });
});

describe('Engine export flows', () => {
  beforeEach(() => {
    global.URL.createObjectURL = jest.fn(() => 'blob:mock');
    global.URL.revokeObjectURL = jest.fn();
  });

  test('exportToDOCX builds document and triggers download', async () => {
    document.body.innerHTML = [
      '<div id="nodesContainer"></div>',
      '<svg id="svgConnections"></svg>'
    ].join('');

    Engine.data = {
      nodos: [{ id: 'n1', tipo: 'formulario', titulo: 'A', x: 0, y: 0, width: 100, height: 80 }],
      conexiones: []
    };

    global.html2canvas = jest.fn().mockResolvedValue({
      toDataURL: () => 'data:image/png;base64,',
    });
    global.fetch = jest.fn().mockResolvedValue({ arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)) });

    const docxStub = {
      Document: function Document(opts) { return { opts }; },
      Packer: { toBlob: jest.fn().mockResolvedValue(new Blob(['doc'])) },
      Paragraph: function Paragraph(opts) { return { opts }; },
      TextRun: function TextRun(opts) { return { opts }; },
      HeadingLevel: {},
      ImageRun: function ImageRun(opts) { return { opts }; },
      Table: function Table(opts) { return { opts }; },
      TableRow: function TableRow(opts) { return { opts }; },
      TableCell: function TableCell(opts) { return { opts }; },
      WidthType: { PERCENTAGE: 'pct' },
      PageBreak: function PageBreak() {},
      AlignmentType: {}
    };

    window.docx = docxStub;

    const originalCreateElement = document.createElement.bind(document);
    const anchor = { click: jest.fn() };
    jest.spyOn(document, 'createElement').mockImplementation((tag) => {
      if (tag === 'a') return anchor;
      return originalCreateElement(tag);
    });

    await Engine.exportToDOCX();

    expect(docxStub.Packer.toBlob).toHaveBeenCalled();
    expect(anchor.download).toMatch(/\.docx$/);
  });

  test('exportToCSV bundles nodes and connections', async () => {
    Engine.data = {
      nodos: [{ id: 'n2', tipo: 'formulario', titulo: 'Nodo', descripcion: '', pregunta: '', x: 1, y: 2, width: 3, height: 4 }],
      conexiones: [{ id: 'c2', from: 'n2', to: 'n2', fromPos: 'right', toPos: 'left', condicionNombre: '', condicionValor: '' }]
    };

    Engine.exportToCSV();

    const blob = global.URL.createObjectURL.mock.calls[0][0];
    const text = await blob.text();
    expect(text).toContain('### NODOS ###');
    expect(text).toContain('### CONEXIONES ###');
    expect(text).toContain('n2');
  });
});

describe('Tesauro manager', () => {
  test('imports tesauros and syncs options', () => {
    jest.spyOn(window, 'alert').mockImplementation(() => {});
    DataTesauro.campos = [{ ref: 'EXIST', nombre: 'Existente', tipo: 'texto', opciones: [] }];
    DataTesauro.sync = jest.fn();
    DataTesauro.render = jest.fn();
    global.Engine = { tesauro: [] };

    const mainCSV = [
      'h1;h2;h3;h4;ref;nombre;;;;;;;;;;;;;;;;;;;;selector;sin hora',
      'a;b;c;d;REF1;Campo Uno;;;;;;;;;;;;;;;;;;;;selector;sin hora'
    ].join('\n');

    const valCSV = [
      'refTes;refOpt;;valor',
      'REF1;OPT1;;Opción 1'
    ].join('\n');

    DataTesauro.importTesauroFromCSV(mainCSV, valCSV);

    const nuevo = DataTesauro.campos.find((c) => c.ref === 'REF1');
    expect(nuevo).toBeTruthy();
    expect(nuevo.opciones).toHaveLength(1);
    expect(global.Engine.tesauro.some((c) => c.ref === 'REF1')).toBe(true);
  });
});

describe('Engine core builders', () => {
  beforeEach(() => {
    Engine.data = { nodos: [], conexiones: [] };
    Engine.saveHistory = jest.fn();
    global.Renderer = { renderNode: jest.fn(), drawConnection: jest.fn(), redrawConnections: jest.fn(), container: null };
  });

  test('createNode sets defaults and stores node', () => {
    const nodo = Engine.createNode('formulario');
    expect(nodo.id).toBeTruthy();
    expect(Engine.data.nodos).toContain(nodo);
    expect(Engine.saveHistory).toHaveBeenCalled();
  });

  test('createConnection links two nodes and avoids duplicates', () => {
    Engine.data.nodos = [
      { id: 'n1', tipo: 'formulario', x: 0, y: 0, width: 10, height: 10 },
      { id: 'n2', tipo: 'formulario', x: 20, y: 20, width: 10, height: 10 }
    ];

    const conn1 = Engine.createConnection('n1', 'n2', 'right', 'left');
    const conn2 = Engine.createConnection('n1', 'n2', 'right', 'left');

    expect(conn1).toBeDefined();
    expect(conn2).toBe(conn1);
    expect(Engine.data.conexiones).toHaveLength(1);
    expect(Engine.saveHistory).toHaveBeenCalledTimes(1);
  });
});
