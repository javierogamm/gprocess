const { handleTesauroDrop, sanitizeTesauroNumeric } = require('../js/core/renderer.js');
const { DataTesauro } = require('../js/features/datatesauro.js');

describe('handleTesauroDrop', () => {
  let event;

  beforeEach(() => {
    global.Engine = {
      tesauro: [],
      updateConnectionCondition: jest.fn(),
      getConnection: jest.fn(),
      saveHistory: jest.fn(),
      updateConnections: jest.fn(),
      data: { conexiones: [] }
    };
    global.Renderer = { flashConnection: jest.fn() };

    event = {
      preventDefault: jest.fn(),
      dataTransfer: {
        getData: jest.fn()
      }
    };

    jest.spyOn(window, 'alert').mockImplementation(() => {});
    jest.spyOn(window, 'prompt').mockImplementation(() => null);
    jest.spyOn(window, 'confirm').mockImplementation(() => true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete global.Engine;
    delete global.Renderer;
  });

  const setPayload = (payload) => {
    const raw = JSON.stringify(payload);
    event.dataTransfer.getData.mockImplementation((type) =>
      type === 'application/x-tesauro' ? raw : ''
    );
  };

  test('applies selector values via reference prompt', () => {
    const payload = { tipo: 'selector', nombre: 'Estado', refCampo: 'EST', valor: '' };
    Engine.tesauro = [{ nombre: 'Estado', ref: 'EST', opciones: [{ ref: 'A', valor: 'Activo' }] }];
    setPayload(payload);
    window.prompt.mockReturnValue('A');

    handleTesauroDrop(event, 'c1');

    expect(event.preventDefault).toHaveBeenCalled();
    expect(Engine.updateConnectionCondition).toHaveBeenCalledWith('c1', 'Estado', 'Activo');
    expect(Renderer.flashConnection).toHaveBeenCalledWith('c1');
  });

  test('applies si_no using confirm dialog result', () => {
    const payload = { tipo: 'si_no', nombre: 'Archivado', valor: '' };
    setPayload(payload);
    window.confirm.mockReturnValue(false);

    handleTesauroDrop(event, 'c2');

    expect(Engine.updateConnectionCondition).toHaveBeenCalledWith('c2', 'Archivado', 'No');
  });

  test('keeps provided texto value without prompting', () => {
    const payload = { tipo: 'texto', nombre: 'Comentario', valor: ' listo ' };
    setPayload(payload);

    handleTesauroDrop(event, 'c3');

    expect(window.prompt).not.toHaveBeenCalled();
    expect(Engine.updateConnectionCondition).toHaveBeenCalledWith('c3', 'Comentario', 'listo');
  });

  test('sanitizes numeric input for numerico fields', () => {
    const payload = { tipo: 'numerico', nombre: 'Importe', valor: '', needsInput: true };
    setPayload(payload);
    window.prompt.mockReturnValue(' 1.234,56 € ');

    handleTesauroDrop(event, 'c4');

    expect(Engine.updateConnectionCondition).toHaveBeenCalledWith('c4', 'Importe', '1234.56');
  });

  test('sanitizes provided moneda values', () => {
    const payload = { tipo: 'moneda', nombre: 'Presupuesto', valor: '€9.990,00' };
    setPayload(payload);

    handleTesauroDrop(event, 'c5');

    expect(Engine.updateConnectionCondition).toHaveBeenCalledWith('c5', 'Presupuesto', '9990.00');
  });

  test('trims fecha inputs from prompt', () => {
    const payload = { tipo: 'fecha', nombre: 'Entrega', valor: '', needsInput: true };
    setPayload(payload);
    window.prompt.mockReturnValue('2024-01-05 ');

    handleTesauroDrop(event, 'c6');

    expect(Engine.updateConnectionCondition).toHaveBeenCalledWith('c6', 'Entrega', '2024-01-05');
  });
});

describe('sanitizeTesauroNumeric', () => {
  test('normalizes decimals and thousands separators', () => {
    expect(sanitizeTesauroNumeric('1.234,56')).toBe('1234.56');
    expect(sanitizeTesauroNumeric('-9,876.5')).toBe('-9876.5');
  });
});

describe('DataTesauro.buildDragPayloadFromEl', () => {
  const buildPayload = (tipo) => {
    const pill = document.createElement('span');
    pill.setAttribute('data-dnd', tipo);
    pill.setAttribute('data-campo-nombre', 'Precio');
    pill.setAttribute('data-campo-ref', 'PREC');
    pill.setAttribute('data-needs-input', 'true');
    return DataTesauro.buildDragPayloadFromEl(pill);
  };

  test('returns payload for moneda drag items', () => {
    expect(buildPayload('moneda')).toEqual({
      tipo: 'moneda',
      nombre: 'Precio',
      refCampo: 'PREC',
      needsInput: true
    });
  });

  test('returns payload for fecha drag items', () => {
    expect(buildPayload('fecha')).toEqual({
      tipo: 'fecha',
      nombre: 'Precio',
      refCampo: 'PREC',
      needsInput: true
    });
  });
});
