import React, { useState } from 'react';
import Papa from 'papaparse';

// ======================================================
// TIPOS
// ======================================================

interface CardRow {
  Name: string;
  Qty: number;
  Set: string;
  Foil: string;
  'Collector Number': string;
  Condition: string;
  Language: string;
  'Purchase Price': string;
  Binder: string;
  'Tradelist Qty': number;
  DisplayPrice?: string | number;
}

function App(): React.JSX.Element {

  // ======================================================
  // ESTADOS
  // ======================================================

  const [cardName, setCardName] = useState<string>('');
  const [cardSet, setCardSet] = useState<string>('');
  const [collectorNumber, setCollectorNumber] = useState<string>('');
  const [language, setLanguage] = useState<string>('en');
  const [isFoil, setIsFoil] = useState<boolean>(false);

  const [csvList, setCsvList] = useState<CardRow[]>([]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [previewCard, setPreviewCard] = useState<any | null>(null);

  const [loading, setLoading] = useState<boolean>(false);

  const [languageWarning, setLanguageWarning] = useState<string>('');

  const precioActivo = previewCard
    ? (
        isFoil
          ? previewCard.prices?.eur_foil
          : previewCard.prices?.eur
      )
    : null;

  // ======================================================
  // BUSCAR CARTA
  // ======================================================

  async function buscarCartaEnScryfall() {

    try {

      setLoading(true);
      setPreviewCard(null);
      setLanguageWarning('');

      let url = '';

      // ==========================================
      // BÚSQUEDA POR SET + NÚMERO
      // ==========================================

      if (cardSet && collectorNumber) {

        url = `https://api.scryfall.com/cards/${cardSet.toLowerCase()}/${collectorNumber}/${language}`;
      }

      // ==========================================
      // BÚSQUEDA POR NOMBRE
      // ==========================================

      else if (cardName) {

        url = `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(cardName)}`;
      }

      // ==========================================
      // SIN DATOS
      // ==========================================

      else {

        alert('Introduce Set y Número de colección');
        return;
      }

      // ==========================================
      // PRIMER INTENTO
      // ==========================================

      let response = await fetch(url);

      // ==========================================
      // FALLBACK DE IDIOMA
      // ==========================================

      if (!response.ok && cardSet && collectorNumber) {

        const fallbackUrl =
          `https://api.scryfall.com/cards/${cardSet.toLowerCase()}/${collectorNumber}`;

        const fallbackResponse = await fetch(fallbackUrl);

        // Carta no encontrada realmente
        if (!fallbackResponse.ok) {

          alert('Carta no encontrada en Scryfall con esos datos.');
          return;
        }

        const fallbackData = await fallbackResponse.json();

        // Idioma disponible real
        const detectedLanguage = fallbackData.lang || 'en';

        // Actualizar selector automáticamente
        setLanguage(detectedLanguage);

        // Mostrar aviso
        setLanguageWarning(
          `El idioma seleccionado no estaba disponible. Se ha cambiado a "${detectedLanguage.toUpperCase()}".`
        );

        // Guardar preview
        setPreviewCard(fallbackData);
      }

      // ==========================================
      // RESPUESTA NORMAL
      // ==========================================

      else {

        if (!response.ok) {

          alert('Carta no encontrada en Scryfall con esos datos.');
          return;
        }

        const data = await response.json();

        // Guardar idioma real
        if (data.lang) {

          setLanguage(data.lang);
        }

        setPreviewCard(data);
      }

    } catch (error) {

      console.error(error);
      alert('Error al conectar con Scryfall');

    } finally {

      setLoading(false);

      // Esperar render
      setTimeout(() => {

        document.getElementById('añadir-input')?.focus();

      }, 100);
    }
  }

  // ======================================================
  // AÑADIR CARTA
  // ======================================================

  function añadirCarta() {

    if (!previewCard) return;

    const nuevaCarta: CardRow = {

      Name: previewCard.name,
      Qty: 1,
      Set: previewCard.set,

      Foil: isFoil
        ? 'foil'
        : '',

      'Collector Number': previewCard.collector_number,

      Condition: 'Near Mint',

      // IMPORTANTE:
      // Guardar idioma REAL
      Language: previewCard.lang || language,

      'Purchase Price': '',
      Binder: '',
      'Tradelist Qty': 0,

      DisplayPrice: isFoil
        ? previewCard.prices?.eur_foil
        : previewCard.prices?.eur,
    };

    setCsvList((prev) => [nuevaCarta, ...prev]);

    // Limpiar formulario
    setPreviewCard(null);
    setCardName('');
    setCollectorNumber('');
    setIsFoil(false);
    setLanguageWarning('');

    // Foco rápido
    document.getElementById('collector-input')?.focus();
  }

  // ======================================================
  // CANCELAR
  // ======================================================

  function cancelarSeleccion() {

    setPreviewCard(null);
    setCardName('');
    setCollectorNumber('');
    setIsFoil(false);
    setLanguageWarning('');

    document.getElementById('collector-input')?.focus();
  }

  // ======================================================
  // LIMPIAR LISTA
  // ======================================================

  function limpiarLista() {

    if (
      window.confirm(
        '¿Estás seguro de que quieres limpiar toda la lista? Esta acción no se puede deshacer.'
      )
    ) {

      setCsvList([]);
    }
  }

  // ======================================================
  // EXPORTAR CSV
  // ======================================================

  function exportarCSV() {

    if (csvList.length === 0) return;

    // Excluir DisplayPrice
    const csvData = csvList.map(
      ({ DisplayPrice, ...rest }) => rest
    );

    const csv = Papa.unparse(csvData);

    const blob = new Blob(
      [csv],
      { type: 'text/csv;charset=utf-8;' }
    );

    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');

    link.href = url;

    link.download =
      `moxfield_export_${new Date().toISOString().slice(0, 10)}.csv`;

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

    URL.revokeObjectURL(url);

    setTimeout(() => {

      if (
        window.confirm(
          '¿Quieres limpiar toda la lista? Esta acción no se puede deshacer.'
        )
      ) {

        setCsvList([]);
      }

    }, 500);
  }

  // ======================================================
  // ELIMINAR CARTA
  // ======================================================

  function eliminarCarta(index: number) {

    setCsvList((prev) =>
      prev.filter((_, i) => i !== index)
    );
  }

  // ======================================================
  // IMAGEN
  // ======================================================

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getImageUrl = (cardData: any) => {

    if (!cardData) return '';

    if (cardData.image_uris?.normal) {

      return cardData.image_uris.normal;
    }

    if (
      cardData.card_faces &&
      cardData.card_faces[0]?.image_uris?.normal
    ) {

      return cardData.card_faces[0].image_uris.normal;
    }

    return 'https://via.placeholder.com/488x680?text=No+Image';
  };

  // ======================================================
  // RENDER
  // ======================================================

  return (
    <div className="min-h-screen bg-slate-900 text-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-blue-400 mb-8 text-center">
          Creador de CSV para Moxfield
        </h1>

        {/* SECCIÓN SUPERIOR: BUSCADOR + PREVIEW */}
        {/* SOLUCIÓN: Cambiado h-[400px] por h-auto lg:h-[400px] */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8 h-auto lg:h-[400px]">

          {/* PANEL DE BÚSQUEDA */}
          <div className="lg:col-span-1 bg-slate-800 p-6 rounded-lg shadow-md flex flex-col justify-between">
            <div>
              <h2 className="text-xl font-semibold mb-4 text-blue-400">
                1. Buscar carta
              </h2>

              <div className="space-y-4">
                {/* Nombre */}
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Nombre</label>
                  <input
                    type="text"
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value)}
                    placeholder="Ej: Light"
                    className="w-full px-3 py-2 bg-slate-700 rounded border border-slate-600 text-white"
                    onKeyDown={(e) => e.key === 'Enter' && buscarCartaEnScryfall()}
                  />
                </div>

                {/* Inputs (Set y Número) */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-1">
                    <label className="block text-sm text-gray-300 mb-1">Set</label>
                    <input
                      id="set-input"
                      type="text"
                      value={cardSet}
                      onChange={(e) => setCardSet(e.target.value)}
                      placeholder="lea"
                      className="w-full px-3 py-2 bg-slate-700 rounded border border-slate-600 text-white uppercase placeholder:normal-case"
                      onKeyDown={(e) => e.key === 'Enter' && buscarCartaEnScryfall()}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm text-gray-300 mb-1">Nº Colección</label>
                    <input
                      id="collector-input"
                      type="text"
                      value={collectorNumber}
                      onChange={(e) => setCollectorNumber(e.target.value)}
                      placeholder="233"
                      className="w-full px-3 py-2 bg-slate-700 rounded border border-slate-600 text-white"
                      onKeyDown={(e) => e.key === 'Enter' && buscarCartaEnScryfall()}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 items-end">
                  {/* Lenguaje */}
                  <div className="col-span-2">
                    <label className="block text-sm text-gray-300 mb-1">Idioma</label>
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-700 rounded border border-slate-600 text-white"
                    >
                      <option value="en">Inglés</option>
                      <option value="es">Español</option>
                      <option value="fr">Francés</option>
                      <option value="de">Alemán</option>
                      <option value="it">Italiano</option>
                      <option value="pt">Portugués</option>
                      <option value="ja">Japonés</option>
                      <option value="ko">Coreano</option>
                      <option value="ru">Ruso</option>
                      <option value="zhs">Chino Simp.</option>
                      <option value="zht">Chino Trad.</option>
                    </select>
                  </div>

                  {/* Toggle Foil */}
                  <div className="col-span-1 flex items-center gap-2 justify-center">
                    <div className="space-y-1 flex flex-col items-center">
                      <div>
                        <label className="text-sm text-gray-300 font-medium">Foil</label>
                      </div>

                      <div>
                        <button
                          type="button"
                          onClick={() => setIsFoil(!isFoil)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            isFoil ? 'bg-yellow-500' : 'bg-slate-500'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              isFoil ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={buscarCartaEnScryfall}
              disabled={loading}
              className="mt-6 w-full bg-blue-500 hover:bg-blue-600 disabled:bg-blue-800 text-white px-6 py-2.5 rounded font-bold transition duration-150"
            >
              {loading ? 'Buscando...' : 'Buscar (Enter)'}
            </button>
          </div>

          {/* PANEL DE VISTA PREVIA Y ACCIONES */}
          <div className={`lg:col-span-2 bg-slate-800 p-6 rounded-lg shadow-md transition-opacity duration-300 flex flex-col justify-center ${previewCard ? 'opacity-100' : 'opacity-50'}`}>
            <h2 className="text-xl font-semibold mb-4 text-green-400">
              2. Confirmar y Añadir
            </h2>

            {previewCard ? (
              <div className="flex flex-col md:flex-row gap-6 items-center md:items-start h-full">
                <img
                  src={getImageUrl(previewCard)}
                  alt={previewCard.name}
                  className="w-48 md:w-56 rounded-lg shadow-2xl border-4 border-slate-700"
                />

                <div className="flex-1 w-full flex flex-col justify-between h-full min-h-[200px]">
                  <div className="text-center md:text-left">
                    <h3 className="text-2xl font-bold">{previewCard.name}</h3>

                    <p className="text-gray-400 uppercase text-sm mt-1">
                      {previewCard.set_name} ({previewCard.set.toUpperCase()}) #{previewCard.collector_number}
                    </p>

                    <p className={`text-xl mt-2 font-mono font-bold flex items-center justify-center md:justify-start gap-1 ${
                      isFoil ? 'text-purple-400' : 'text-orange-300'
                    }`}>
                      {isFoil && <span className="text-sm">✨</span>}
                      {precioActivo ? `${precioActivo} €` : '--- €'}
                    </p>
                    <div className="h-[40px] flex items-center justify-center p-4">

                    </div>
                    {languageWarning && (
                      <div className="mb-4 rounded-lg bg-yellow-500/20 border border-yellow-500 text-yellow-200 px-4 py-3 text-center">
                        {languageWarning}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 md:mt-0">
                    <button
                      id="añadir-input"
                      onClick={añadirCarta}
                      className="bg-green-600 hover:bg-green-700 text-white px-6 py-4 rounded-xl font-bold text-lg transition shadow-lg flex items-center justify-center gap-2"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>

                      Añadir a la lista
                    </button>

                    <button
                      onClick={cancelarSeleccion}
                      className="bg-slate-600 hover:bg-slate-700 text-white px-6 py-4 rounded-xl font-bold text-lg transition"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full min-h-[250px] border-2 border-dashed border-slate-600 rounded-lg">
                <p className="text-gray-500 italic text-center p-4">
                  Busca una carta a la izquierda para ver la vista previa aquí.
                  <br />
                  Se recomienda usar Set y Número para mayor precisión.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* LISTA ACTUAL (TABLA) */}
        <div className="bg-slate-800 p-6 rounded-lg shadow-md">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
            <h2 className="text-xl font-semibold">
              Tu Lista ({csvList.length} {csvList.length === 1 ? 'carta' : 'cartas'})
            </h2>

            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <button
                onClick={limpiarLista}
                disabled={csvList.length === 0}
                className="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white px-5 py-2.5 rounded-lg font-bold transition flex items-center gap-2 w-full sm:w-auto justify-center order-2 sm:order-1"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>

                Limpiar Lista
              </button>

              <button
                onClick={exportarCSV}
                disabled={csvList.length === 0}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-5 py-2.5 rounded-lg font-bold transition flex items-center gap-2 w-full sm:w-auto justify-center order-1 sm:order-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>

                Descargar CSV
              </button>
            </div>
          </div>

          {csvList.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-slate-700 rounded-lg">
              <p className="text-gray-400 text-base italic">
                No hay cartas en la lista todavía. ¡Utiliza el buscador superior!
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-300 min-w-[600px]">
                <thead className="bg-slate-700 text-gray-200 uppercase text-xs">
                  <tr>
                    <th className="p-3 font-semibold">Nombre</th>
                    <th className="p-3 font-semibold text-center">Set</th>
                    <th className="p-3 font-semibold text-center">Nº Col.</th>
                    <th className="p-3 font-semibold text-center">Idioma</th>
                    <th className="p-3 font-semibold text-center">Foil</th>
                    <th className="p-3 font-semibold text-center">Precio</th>
                    <th className="p-3 font-semibold text-center">Acciones</th>
                  </tr>
                </thead>

                <tbody>
                  {csvList.map((carta, index) => (
                    <tr
                      key={index}
                      className="border-b border-slate-700 hover:bg-slate-750 transition-colors"
                    >
                      <td className="p-3 font-medium text-white text-base">
                        {carta.Name}
                      </td>

                      <td className="p-3 uppercase text-center font-mono bg-slate-700/30 rounded">
                        {carta.Set}
                      </td>

                      <td className="p-3 text-center font-mono">
                        {carta['Collector Number']}
                      </td>

                      <td className="p-3 text-center uppercase">
                        {carta.Language}
                      </td>

                      <td className="p-3 text-center text-yellow-400 text-lg">
                        {carta.Foil ? '⭐' : ''}
                      </td>

                      <td className="p-3 text-center font-bold">
                        {carta.DisplayPrice ? `${carta.DisplayPrice} €` : '-'}
                      </td>

                      <td className="p-3 text-center">
                        <button
                          onClick={() => eliminarCarta(index)}
                          className="bg-red-900/50 hover:bg-red-700 text-red-200 rounded-full p-1.5 transition"
                          title="Eliminar carta"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <footer className="mt-12 text-center text-gray-500 text-xs">
          Datos proporcionados por la API de Scryfall. No afiliado con Wizards of the Coast o Moxfield.
        </footer>
      </div>
    </div>
  );
}

export default App;