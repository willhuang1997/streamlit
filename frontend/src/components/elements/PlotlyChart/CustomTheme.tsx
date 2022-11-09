/**
 * Copyright (c) Streamlit Inc. (2018-2022) Snowflake Inc. (2022)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { assign, isEqual, merge } from "lodash"

import {
  getDecreasingRed,
  getGray30,
  getGray70,
  getGray90,
  getIncreasingGreen,
  hasLightBackgroundColor,
  getCategoricalColorsArray,
  Theme,
  getSequentialColorsArray,
  getDivergingColorsArray,
} from "src/theme"
import { ensureError } from "src/lib/ErrorHandling"
import { logError } from "src/lib/log"

/**
 * Plotly represents continuous colorscale through an array of pairs.
 * The pair's first index is the starting point and the next pair's first index is the end point.
 * The pair's second index is the starting color and the next pair's second index is the end color.
 * An example would be:
 *  [
 *    [0, "rgb(166,206,227)"],
 *    [0.25, "rgb(31,120,180)"],
 *    [0.45, "rgb(178,223,138)"],
 *    [0.65, "rgb(51,160,44)"],
 *    [0.85, "rgb(251,154,153)"],
 *    [1, "rgb(227,26,28)"]
 *  ]
 * For more information, please refer to https://plotly.com/python/colorscales/
 * @param colors
 * @returns
 */
function convertColorArrayPlotly(colors: string[]): (string | number)[][] {
  const plotlyColorArray: (string | number)[][] = []
  colors.forEach((color: string, index: number) => {
    plotlyColorArray.push([index / (colors.length - 1), color])
  })
  return plotlyColorArray
}

function isMarkerWithDiscreteColor(marker: any): boolean {
  return marker !== undefined && typeof marker.color === "string"
}

function isTransparentDistPlot(data: any): boolean {
  if (data.line !== undefined) {
    if (
      data.type !== "box" &&
      data.line.color !== "rgba(255,255,255,0)" &&
      data.line.color !== "transparent"
    ) {
      return true
    }
  }
  return false
}

function isCustomColor(data: any): boolean {
  if (
    data.customdata !== undefined &&
    data.marker !== undefined &&
    Array.isArray(data.marker.colors) &&
    data.marker.colors.length > 0 &&
    typeof data.marker.colors[0] !== "number"
  ) {
    return true
  }
  return false
}

/**
 * TODO: FIX THIS DESCRIPTION!
 * This is determined by whether or not the first marker in any graph is not the default plotly color
 * @param data
 * @returns
 */
function shouldOverrideDiscreteColors(data: any): boolean {
  const DEFAULT_PLOTLY_COLOR = "#636efa"
  const DEFAULT_PLOTLY_COLOR_HIST = "rgb(31, 119, 180)"
  if (data.length >= 1) {
    if (
      isMarkerWithDiscreteColor(data[0].marker) &&
      data[0].marker.color === DEFAULT_PLOTLY_COLOR
    ) {
      return true
    }
    if (data[0].line !== undefined) {
      if (
        isTransparentDistPlot(data[0]) &&
        data[0].line.color === DEFAULT_PLOTLY_COLOR
      ) {
        return true
      }
    }
    if (
      isCustomColor(data[0]) &&
      data[0].marker.colors[0] === DEFAULT_PLOTLY_COLOR
    ) {
      return true
    }
    if (
      data[0].marker !== undefined &&
      typeof data[0].marker.color === "string" &&
      data[0].type === "histogram" &&
      data[0].marker.color === DEFAULT_PLOTLY_COLOR_HIST
    ) {
      return true
    }
  }
  return false
}

/**
 * TODO: FIX THIS DESCRIPTION!
 * Determines whether or not
 * @param colorscale
 * @returns
 */
function shouldOverrideColorscale(colorscale: (string | number)[][]): boolean {
  const defaultSequentialColors = [
    [0.0, "#0d0887"],
    [0.1111111111111111, "#46039f"],
    [0.2222222222222222, "#7201a8"],
    [0.3333333333333333, "#9c179e"],
    [0.4444444444444444, "#bd3786"],
    [0.5555555555555556, "#d8576b"],
    [0.6666666666666666, "#ed7953"],
    [0.7777777777777778, "#fb9f3a"],
    [0.8888888888888888, "#fdca26"],
    [1.0, "#f0f921"],
  ]
  // check that plotly default colors aren't changed
  if (isEqual(colorscale, defaultSequentialColors)) {
    return true
  }
  return false
}

/**
 * TODO: FIX THIS DESCRIPTION
 * @param layout
 * @returns
 */
function shouldOverridePXColorscale(layout: any): boolean {
  if (
    layout.coloraxis !== undefined &&
    layout.coloraxis.colorscale !== undefined
  ) {
    return shouldOverrideColorscale(layout.coloraxis.colorscale)
  }
  return false
}

/**
 * This overrides table properties when entry.type === "table" and
 * the default values are still there.
 * All the colors come from DataFrame.tsx properties.
 * @param tableData
 * @param theme
 */
function overrideDefaultTableProperties(tableData: any, theme: Theme): void {
  const DEFAULT_TABLE_LINE_COLOR = "white"
  const DEFAULT_TABLE_CELLS_FILL_COLOR = "#EBF0F8"
  const DEFAULT_TABLE_HEAD_FILL_COLOR = "#C8D4E3"

  const { colors, genericFonts } = theme

  if (tableData.cells.font === undefined) {
    assign(tableData.cells, {
      font: {
        color: getGray90(theme),
      },
    })
  }
  // guarantees tableData.cells.font will be defined from above
  if (tableData.cells.font.family === undefined) {
    assign(tableData.cells.font, {
      family: genericFonts.bodyFont,
    })
  }
  if (
    tableData.cells.fill !== undefined ||
    tableData.cells.fill.color === DEFAULT_TABLE_CELLS_FILL_COLOR
  ) {
    assign(tableData.cells, {
      fill: {
        color: colors.bgColor,
      },
    })
  }
  // tableData.cells.line.color is always defined
  if (tableData.cells.line.color === DEFAULT_TABLE_LINE_COLOR) {
    assign(tableData.cells, {
      line: { color: colors.fadedText05 },
    })
  }
  if (tableData.header.font === undefined) {
    assign(tableData.header, {
      font: {
        color: getGray70(theme),
      },
    })
  }
  // guarantees tableData.header.font will be defined from above
  if (tableData.header.font.family === undefined) {
    assign(tableData.header.font, {
      family: genericFonts.bodyFont,
    })
  }
  // tableData.header.line.color is always defined
  if (tableData.header.line.color === DEFAULT_TABLE_LINE_COLOR) {
    assign(tableData.header, {
      line: { color: colors.fadedText05 },
    })
  }
  // tableData.header.fill.color is always defined
  if (tableData.header.fill.color === DEFAULT_TABLE_HEAD_FILL_COLOR) {
    assign(tableData.header, {
      fill: {
        color: colors.bgMix,
      },
    })
  }
}

function applyContinuousColor(layout: any, theme: Theme): void {
  const continuousColors = {
    coloraxis: {
      colorscale: {
        diverging: convertColorArrayPlotly(getDivergingColorsArray(theme)),
        sequential: convertColorArrayPlotly(getSequentialColorsArray(theme)),
        sequentialminus: convertColorArrayPlotly(
          getDivergingColorsArray(theme)
        ),
      },
    },
    colorscale: {
      diverging: convertColorArrayPlotly(getDivergingColorsArray(theme)),
      sequential: convertColorArrayPlotly(getSequentialColorsArray(theme)),
      sequentialminus: convertColorArrayPlotly(getDivergingColorsArray(theme)),
    },
  }
  merge(layout, continuousColors)
}

/**
 * This applies categorical colors (discrete or labeled data) to
 * graphs by mapping legend groups to marker colors and customdata to marker colors.
 * This is done because colorway is not fully respected by plotly.
 * @param data - spec.data
 */
function applyDiscreteColors(data: any, theme: Theme): void {
  const categoryColors = getCategoricalColorsArray(theme)

  const legendGroupToIndexes = new Map<string, number[]>()
  const customDataToDataIdx = new Map<string, number[]>()
  const graphIdxToCustomData = new Map<number, Map<string, number[]>>()
  data.forEach((graph: any, graphIndex: number) => {
    if (isCustomColor(graph)) {
      graph.customdata.forEach((data: any, dataIndex: any) => {
        const dataString = data.toString()
        if (Array.isArray(data) && data.length > 0) {
          if (customDataToDataIdx.has(dataString)) {
            customDataToDataIdx.set(
              dataString,
              // @ts-ignore
              customDataToDataIdx.get(dataString)?.concat(dataIndex)
            )
          } else {
            customDataToDataIdx.set(dataString, [dataIndex])
          }
        }
      })
      graphIdxToCustomData.set(graphIndex, customDataToDataIdx)
    }
    if (graph.legendgroup !== undefined) {
      if (legendGroupToIndexes.has(graph.legendgroup)) {
        legendGroupToIndexes.set(
          graph.legendgroup,
          // @ts-ignore
          legendGroupToIndexes.get(graph.legendgroup).concat(graphIndex)
        )
      } else {
        legendGroupToIndexes.set(graph.legendgroup, [graphIndex])
      }
    }
  })

  let colorIndex = 0
  legendGroupToIndexes.forEach((dataIdx: number[]) => {
    dataIdx.forEach((index: number) => {
      if (data[index].line !== undefined) {
        // dont assign colors for dist plot boxes when they're transparent
        if (isTransparentDistPlot(data[index])) {
          data[index].line = assign(data[index].line, {
            color: categoryColors[colorIndex % categoryColors.length],
          })
        }
      }
      if (isMarkerWithDiscreteColor(data[index].marker)) {
        data[index].marker = assign(data[index].marker, {
          color: categoryColors[colorIndex % categoryColors.length],
        })
      }
    })
    colorIndex++
  })

  colorIndex = 0
  graphIdxToCustomData.forEach(
    (customData: Map<string, number[]>, dataIndex: number) => {
      customData.forEach(markerIndexes => {
        markerIndexes.forEach(markerIndex => {
          data[dataIndex].marker.colors[markerIndex] =
            categoryColors[colorIndex % categoryColors.length]
        })
        colorIndex++
      })
    }
  )
}

/**
 * This overrides the colorscale (continuous colorscale) to all graphs.
 * @param data - spec.data
 */
export function applyColorscale(data: any, theme: Theme): any {
  data.forEach((entry: any) => {
    if (
      entry.colorscale !== undefined &&
      shouldOverrideColorscale(entry.colorscale)
    ) {
      assign(entry, {
        colorscale: convertColorArrayPlotly(getSequentialColorsArray(theme)),
      })
    }
  })
  return data
}

/**
 * This applies colors specifically for the table, candlestick, and waterfall plot
 * because their dictionary structure is different from other more regular charts.
 * @param data - spec.data
 */
export function applyUniqueGraphColorsData(data: any, theme: Theme): void {
  data.forEach((entry: any) => {
    // entry.type is always defined
    if (entry.type === "candlestick") {
      if (entry.decreasing === undefined) {
        assign(entry, {
          decreasing: {
            line: {
              color: getDecreasingRed(theme),
            },
          },
        })
        assign(entry, {
          increasing: {
            line: {
              color: getIncreasingGreen(theme),
            },
          },
        })
      }
    } else if (entry.type === "waterfall") {
      assign(entry, {
        connector: {
          line: {
            color: getGray30(theme),
            width: 2,
          },
        },
      })
      if (entry.decreasing === undefined) {
        assign(entry, {
          decreasing: {
            marker: {
              color: getDecreasingRed(theme),
            },
          },
          increasing: {
            marker: {
              color: getIncreasingGreen(theme),
            },
          },
          totals: {
            marker: {
              color: hasLightBackgroundColor(theme)
                ? theme.colors.blue80
                : theme.colors.blue40,
            },
          },
        })
      }
    }
  })
}

/**
 * This applies general layout changes to things such as x axis,
 * y axis, legends, titles, grid changes, background, etc.
 * @param layout - spec.layout.template.layout
 * @param theme - Theme from useTheme()
 */
export function applyStreamlitThemeTemplateLayout(
  layout: any,
  theme: Theme
): void {
  const { genericFonts, colors, fontSizes } = theme

  const streamlitTheme = {
    uniformtext: {
      // hide all text that is less than 6 px
      minsize: 6,
      mode: "hide",
    },
    font: {
      color: getGray70(theme),
      family: genericFonts.bodyFont,
      size: fontSizes.twoSmPx,
    },
    title: {
      color: colors.headingColor,
      subtitleColor: colors.bodyText,
      font: {
        family: genericFonts.headingFont,
        size: fontSizes.mdPx,
        color: colors.headingColor,
      },
      pad: {
        l: theme.spacing.twoXSPx,
      },
      xanchor: "left",
      x: 0,
    },
    colorway: getCategoricalColorsArray(theme),
    legend: {
      title: {
        font: {
          size: fontSizes.twoSmPx,
          color: getGray70(theme),
        },
        side: "top",
      },
      valign: "top",
      bordercolor: colors.transparent,
      borderwidth: theme.spacing.nonePx,
      font: {
        size: fontSizes.twoSmPx,
        color: getGray90(theme),
      },
    },
    paper_bgcolor: colors.bgColor,
    plot_bgcolor: colors.bgColor,
    yaxis: {
      ticklabelposition: "outside",
      zerolinecolor: getGray30(theme),
      title: {
        font: {
          color: getGray70(theme),
          size: fontSizes.smPx,
        },
        standoff: theme.spacing.twoXLPx,
      },
      tickcolor: getGray30(theme),
      tickfont: {
        color: getGray70(theme),
        size: fontSizes.twoSmPx,
      },
      gridcolor: getGray30(theme),
      minor: {
        gridcolor: getGray30(theme),
      },
      automargin: true,
    },
    xaxis: {
      zerolinecolor: getGray30(theme),
      gridcolor: getGray30(theme),
      showgrid: false,
      tickfont: {
        color: getGray70(theme),
        size: fontSizes.twoSmPx,
      },
      tickcolor: getGray30(theme),
      title: {
        font: {
          color: getGray70(theme),
          size: fontSizes.smPx,
        },
        standoff: theme.spacing.mdPx,
      },
      minor: {
        gridcolor: getGray30(theme),
      },
      zeroline: false,
      automargin: true,
    },
    margin: {
      pad: theme.spacing.lgPx,
      r: theme.spacing.nonePx,
      l: theme.spacing.nonePx,
    },
    hoverlabel: {
      bgcolor: colors.bgColor,
      bordercolor: colors.fadedText10,
      font: {
        color: getGray70(theme),
        family: genericFonts.bodyFont,
        size: fontSizes.twoSmPx,
      },
    },
    coloraxis: {
      colorbar: {
        thickness: 16,
        xpad: theme.spacing.twoXLPx,
        ticklabelposition: "outside",
        outlinecolor: colors.transparent,
        outlinewidth: 8,
        len: 0.75,
        y: 0.5745,
        title: {
          font: {
            color: getGray70(theme),
            size: fontSizes.smPx,
          },
        },
        tickfont: {
          color: getGray70(theme),
          size: fontSizes.twoSmPx,
        },
      },
    },
    // specifically for the ternary graph
    ternary: {
      gridcolor: getGray70(theme),
      bgcolor: colors.bgColor,
      title: {
        font: {
          family: genericFonts.bodyFont,
          size: fontSizes.smPx,
        },
      },
      color: getGray70(theme),
      aaxis: {
        gridcolor: getGray70(theme),
        linecolor: getGray70(theme),
        tickfont: {
          family: genericFonts.bodyFont,
          size: fontSizes.twoSmPx,
        },
      },
      baxis: {
        linecolor: getGray70(theme),
        gridcolor: getGray70(theme),
        tickfont: {
          family: genericFonts.bodyFont,
          size: fontSizes.twoSmPx,
        },
      },
      caxis: {
        linecolor: getGray70(theme),
        gridcolor: getGray70(theme),
        tickfont: {
          family: genericFonts.bodyFont,
          size: fontSizes.twoSmPx,
        },
      },
    },
  }

  // cant use merge. use assign because plotly already has properties defined.
  assign(layout, streamlitTheme)
}

/**
 * Applies the colorscale, colors for unique graphs, and discrete coloring
 * for in general through assigning properties in spec.data
 * @param data - spec.data
 */
export function applyStreamlitThemeData(data: any, theme: Theme): void {
  if (shouldOverrideDiscreteColors(data)) {
    applyDiscreteColors(data, theme)
  }
  data.forEach((entry: any) => {
    if (entry.marker !== undefined) {
      entry.marker.line = assign(entry.marker.line, {
        width: 0,
        color: theme.colors.transparent,
      })
    }
  })
}

/**
 * This applies specific changes for spec.layout.template.data because
 * spec.data does not fully catch these and neither does spec.layout.template.layout
 * @param data - spec.layout.template.data
 * @param theme - Theme from useTheme()
 */
export function applyStreamlitThemeTemplateData(
  data: any,
  theme: Theme
): void {
  if (data !== undefined) {
    data.bar.forEach((entry: any) => {
      if (entry.marker !== undefined && entry.marker.line !== undefined) {
        entry.marker.line = assign(entry.marker.line, {
          color: getGray30(theme),
        })
      }
    })
    const graphTypes = Object.values(data)
    graphTypes.forEach((types: any) => {
      types.forEach((graph: any) => {
        if (graph.colorbar !== undefined && graph.colorbar.ticks === "") {
          // make tick values show
          delete graph.colorbar.ticks
        }
        if (
          graph.colorscale !== undefined &&
          shouldOverrideColorscale(graph.colorscale)
        ) {
          assign(graph, {
            colorscale: convertColorArrayPlotly(
              getSequentialColorsArray(theme)
            ),
          })
        }
        if (graph.type === "table") {
          overrideDefaultTableProperties(graph, theme)
        }
      })
    })
  }
}

/**
 * Applies the Streamlit theme by overriding properties in
 * spec.data, spec.layout.template.data, and spec.layout.template.layout
 * @param spec - spec
 */
export function applyStreamlitTheme(spec: any, theme: Theme): void {
  try {
    applyStreamlitThemeTemplateLayout(spec.layout.template.layout, theme)
    applyStreamlitThemeData(spec.data, theme)
    applyUniqueGraphColorsData(spec.data, theme)
    applyStreamlitThemeTemplateData(spec.layout.template.data, theme)
    if (shouldOverridePXColorscale(spec.layout)) {
      applyContinuousColor(spec.layout.template.layout, theme)
    }
  } catch (e) {
    const err = ensureError(e)
    logError(err)
  }
  if ("title" in spec.layout) {
    spec.layout.title = { text: `<b>${spec.layout.title.text}</b>` }
  }
}

/**
 * Apply minimum changes to graph to fit streamlit
 * @param layout - spec.layout
 * @param theme - theme from useTheme()
 * @returns modified spec.layout
 */
export function layoutWithThemeDefaults(layout: any, theme: Theme): any {
  const { colors, genericFonts } = theme

  const themeDefaults = {
    font: {
      color: colors.bodyText,
      family: genericFonts.bodyFont,
    },
    paper_bgcolor: colors.bgColor,
    plot_bgcolor: colors.secondaryBg,
  }

  // Fill in theme defaults where the user didn't specify layout options.
  return {
    ...layout,
    font: {
      ...themeDefaults.font,
      ...layout.font,
    },
    paper_bgcolor: layout.paper_bgcolor || themeDefaults.paper_bgcolor,
    plot_bgcolor: layout.plot_bgcolor || themeDefaults.plot_bgcolor,
  }
}
