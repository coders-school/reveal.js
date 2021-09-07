/*
 * reveal.js plugin using @toothlessjs/diagram-drawer
 * for turning custom structures into diagrams on slides
 */

import StructureDrawer from '../../node_modules/@toothlessjs/diagram-drawer/index.js';

// each function returns a dictionary that can be used to create StructureDrawer
// here passed arguments use the following convention:
// structure is a string that contains formatted structure
// attributes is a dict which can be used to customize drawings
// i.e.:
// ```structure
// !type: labyrinth
// !cell_size: 20
// S P P W
// W W P W
// W F P W
// ```
// will return attributes { type: labyrinth, cell_size: 20 }
// and structure as the remaining lines

function labyrinth(structure, attributes) {
  const attributes_defaults = {
    cell_size: 50,
    wall_color: "#555",
    floor_color: "#ddd",
    border_color: "#000",
    text_color: "#000"
  }

  for (let key in attributes_defaults) {
    if (!(key in attributes)) attributes[key] = attributes_defaults[key];
  }

  let structure_dict = {
    "background": "",
    "elements": {
      "template": {
        "x": 0,
        "y": 0,
        "width": attributes["cell_size"],
        "height": attributes["cell_size"],
        "border_color": attributes["border_color"],
      },
      "W": {
        "position": "template",
        "copy": "template",
        "background_color": attributes["wall_color"],
      },
      "E": {
        "position": "template",
        "copy": "template",
        "border_color": ""
      },
      "P": {
        "position": "template",
        "copy": "template",
        "background_color": attributes["floor_color"],
      },
      "S": {
        "position": "template",
        "copy": "E",
        "text": "S",
        "text_color": attributes["text_color"],
        "text_size": attributes["cell_size"],
      },
      "F": {
        "position": "template",
        "copy": "S",
        "text": "F"
      }
    },
    "connections": []
  };

  let x = 0;
  let y = 0;
  let max_x = 0;

  for (let row of structure.split("\n")) {
    for (let cell of row.split(" ")) {
      structure_dict["elements"][x.toString() + ":" + y.toString()] = {
        "x": (x + 0.5) * (attributes["cell_size"]),
        "y": (y + 0.5) * (attributes["cell_size"]),
        "copy": cell
      }
      x++;
    }
    y++;
    if (x > max_x) max_x = x;
    x = 0;
  }

  structure_dict["x_size"] = (max_x + 1) * (attributes["cell_size"]);
  structure_dict["y_size"] = (y + 1) * (attributes["cell_size"]);

  return structure_dict;
}

function level_from_index(index) {
  if (index == 1) return 0;
  else return Math.floor(Math.log2(index));
}

function find_position_offset_from_index(index, max_level, attributes) {
  let level = level_from_index(index);
  let relative_level = max_level - level;

  let x_offset = 0;
  let y_offset = 0;
  
  if (level != 0) {
    // find level's origin point since it's not root
    for (let i = 1; i <= level; i++) {
      let curr_relative_level = max_level - i;
      x_offset -= Math.pow(2, 2 + curr_relative_level) * attributes["cell_size"] * attributes["x_scale"];
    }
    y_offset += 4 * level * attributes["cell_size"] * attributes["y_scale"];
  }

  // find x offset
  let index_offset = Math.abs(Math.pow(2, level) - index);
  x_offset += index_offset * Math.pow(2, 3 + relative_level) * attributes["cell_size"] * attributes["x_scale"];

  return [x_offset, y_offset];
}

function red_black_tree(structure, attributes) {
  const attributes_defaults = {
    cell_size: 20,
    text_size: 20,
    x_scale: 0.8,
    y_scale: 0.8
  }

  for (let key in attributes_defaults) {
    if (!(key in attributes)) attributes[key] = attributes_defaults[key];
  }

  let structure_dict = {
    "background": "",
    "elements": {
      "template": {
        "x": 0,
        "y": 0,
        "shape": "ellipse",
        "width": attributes["cell_size"] * 2,
        "height": attributes["cell_size"] * 2,
        "border_color": "#000",
        "border_width": attributes["cell_size"] / 20,
        "background_color": "#000",
        "text_color": "#fff",
        "text_size": attributes["text_size"],
      },
      "B": {
        "position": "template",
        "copy": "template"
      },
      "R": {
        "position": "template",
        "copy": "template",
        "background_color": "#f00"
      }
    },
    "connections": []
  };

  let lines = structure.split('\n');
  let index = 1;
  let tree_nodes = {};

  // convert structure into {index: node} dictionary
  for (let line of lines) {
    let match = line.match(/(.):\s*(.*)\n?/);

    let color = match[1];
    let line_nodes = match[2].split(" ");

    for (let node of line_nodes) {
      let node_match = node.match(/(\d*)(L|R)?/);

      if (node != '-') {
        tree_nodes[index] = {
          color: color,
          value: node_match[1],
          arrow: node_match[2] ? node_match[2] : ""
        }
      }
      index++;
    }
  }

  // get list of indices
  let keys = Object.keys(tree_nodes);
  keys.sort();

  // calculate max level by taking the biggest index
  let max_level = level_from_index(keys[keys.length - 1]);

  // calculate root node position
  let root_x = attributes["cell_size"] * 3;
  let root_y = attributes["cell_size"] * 3;

  let sum = 0;
  for (var i = 0; i < max_level; i++) {
    sum += Math.pow(2, 2 + i);
  }
  root_x += sum * attributes["cell_size"] * attributes["x_scale"]; // magic formula that calculates middle of the tree

  // add all nodes and connections to array
  for (let key of keys) {
    let offset = find_position_offset_from_index(key, max_level, attributes);

    structure_dict["elements"][key] = {
      "x": root_x + offset[0],
      "y": root_y + offset[1],
      "copy": tree_nodes[key]["color"] == "R" ? "R" : "B",
      "text": tree_nodes[key]["value"]
    }

    // connection to left child
    if (keys.indexOf((key * 2).toString()) > -1) {
      structure_dict["connections"].push({
        from: key,
        to: (key * 2).toString(),
        path_width: attributes["cell_size"] / 15
      });
    }

    // connection to right child
    if (keys.indexOf((key * 2 + 1).toString()) > -1) {
      structure_dict["connections"].push({
        from: key,
        to: (key * 2 + 1).toString(),
        path_width: attributes["cell_size"] / 15
      });
    }

    // rotation arrow preparation
    let point1 = {
      x: root_x + offset[0],
      y: root_y + offset[1] - attributes["cell_size"] * 2
    };

    let point2 = {
      x: root_x + offset[0],
      y: root_y + offset[1]
    };

    let segment = {
      x: root_x + offset[0],
      y: root_y + offset[1] - attributes["cell_size"] * 1.5
    }

    let parent_on_right = key % 2 == 0 ? true : false;

    // check if parent is on left or right side
    if (parent_on_right) {
      point2.x -= attributes["cell_size"] * 2;
      segment.x -= attributes["cell_size"] * 1.5;
    } else {
      point2.x += attributes["cell_size"] * 2;
      segment.x += attributes["cell_size"] * 1.5;
    }

    // prepare rotation arrow dict
    let new_connection = {
      smoothing_factor: 0.5,
      path_width: attributes["cell_size"] / 15,
      margin: attributes["cell_size"] / 2,
      segments: [
        segment
      ]
    };

    if (tree_nodes[key]["arrow"] == "R") {

      // create invisible elements to connect
      structure_dict["elements"][key + "R1"] = point1;
      structure_dict["elements"][key + "R2"] = point2;

      // create connection between new elements
      new_connection["from"] = key + "R1";
      new_connection["to"] = key + "R2";
      new_connection["start_arrow"] = parent_on_right ? true : false;
      new_connection["end_arrow"] = parent_on_right ? false : true;

      structure_dict["connections"].push(new_connection);
    } else if (tree_nodes[key]["arrow"] == "L") {

      // create invisible elements to connect
      structure_dict["elements"][key + "L1"] = point1;
      structure_dict["elements"][key + "L2"] = point2;

      // create connection between new elements
      new_connection["from"] = key + "L1";
      new_connection["to"] = key + "L2";
      new_connection["start_arrow"] = parent_on_right ? false : true;
      new_connection["end_arrow"] = parent_on_right ? true : false;

      structure_dict["connections"].push(new_connection);
    }
  };

  structure_dict["x_size"] = root_x * 2 + (attributes["cell_size"] * 2);
  structure_dict["y_size"] = attributes["cell_size"] * attributes["y_scale"] * (4 * max_level + 2) + attributes["cell_size"] * 4;

  return structure_dict;
}

function container(structure, attributes) {
  const attributes_defaults = {
    text_size: 30,
    cell_size: 40,
  }

  for (let key in attributes_defaults) {
    if (!(key in attributes)) attributes[key] = attributes_defaults[key];
  }

  let structure_dict = {
    "background": "#ddd",
    "elements": {
      "cell": {
        "x": 0,
        "y": 0,
        "border_color": "#000",
        "width": attributes["cell_size"],
        "height": attributes["cell_size"],
        "text_size": attributes["cell_size"] * 0.8,
        "text_color": "#000",
      },
      "text": {
        "x": 0,
        "y": 0,
        "shape": "text",
        "width": attributes["cell_size"],
        "height": attributes["cell_size"],
        "text_size": attributes["text_size"],
      }
    },
    "connections": []
  };

  // read function name and its parameters
  let lines = structure.split('\n');
  let regex = /(?<=[\(,])\s*?(\w+)\s*?->\s*?(\d+)\s*?(?=[\),])/gm;
  let params = [];

  for (const match of lines[0].matchAll(regex)) {
    params.push([match[1], match[2]]);
  }

  // render function name
  let function_name = lines[0].match(/.*(?=\()/gm)[0];
  let char_count = function_name.length;

  structure_dict["elements"]["function_name"] = {
    "copy": "text",
    "x": attributes["text_size"] * 0.3 * function_name.length,
    "y": attributes["text_size"] * 0.6,
    "text_color": "#000",
    "text": function_name,
  };

  // render parameter names
  if (params.length == 0) {
    structure_dict["elements"]["brackets"] = {
      "copy": "text",
      "position": "function_name",
      "align": "right",
      "text_color": "#000",
      "text": "()",
    };
    char_count += 2;
  } else if (params.length == 1) {
    structure_dict["elements"]["bracket_left"] = {
      "copy": "text",
      "position": "function_name",
      "align": "right",
      "text_color": "#000",
      "text": "(",
    };
    structure_dict["elements"]["parameter"] = {
      "copy": "text",
      "position": "bracket_left",
      "align": "right",
      "text_color": "#f00",
      "text": params[0][0],
    };
    structure_dict["elements"]["bracket_right"] = {
      "copy": "text",
      "position": "parameter",
      "align": "right",
      "text_color": "#000",
      "text": ")",
    };
    char_count += 2 + params[0][0].length;
  } else {
    for (let i = 0; i < params.length; i++) {
      if (i == 0) {
        structure_dict["elements"]["comma" + i] = {     // actually left_bracket
          "copy": "text",
          "position": "function_name",
          "align": "right",
          "text_color": "#000",
          "text": "(",
        };
      } else {
        structure_dict["elements"]["comma" + i] = {
          "copy": "text",
          "position": "param" + (i - 1),
          "align": "right",
          "text_color": "#000",
          "text": ", ",
        };
      }
      structure_dict["elements"]["param" + i] = {
        "copy": "text",
        "position": "comma" + i,
        "align": "right",
        "text_color": "#f00",
        "text": params[i][0],
      };
      char_count += params[i][0].length;
    }
    structure_dict["elements"]["bracket_right"] = {
      "copy": "text",
      "position": "param" + (params.length - 1),
      "align": "right",
      "text_color": "#000",
      "text": ")",
    };

    char_count += 2 + (params.length - 1) * 2
  }

  // start calculating x_size
  let max_x = attributes["text_size"] * char_count * 0.6;

  function render_array(array_to_render, x_pos, name) {
    for (let i = 0; i < array_to_render.length; i++) {
      if (i == 0) {
        structure_dict["elements"][name + i] = {
          "copy": "cell",
          "text": array_to_render[i],
          "x": x_pos,
          "y": parseInt(attributes["text_size"]) * 1.2 + parseInt(attributes["cell_size"]) * 2,
        }
      } else {
        structure_dict["elements"][name + i] = {
          "copy": "cell",
          "position": name + (i - 1),
          "align": "right",
          "text": array_to_render[i],
        }
      }
    }
  }

  // read array
  let matches = lines[1].match(/^([ \d]*)(?:->([ \d]*))?$/);
  let first_array = matches[1].trim().split(' ');

  // calculate offset of array
  let offset = (function_name.length + params[0][0].length / 2) * attributes["text_size"] * 0.6;
  let pos_x = Math.max(offset - (parseInt(params[0][1]) - 0.5) * attributes["cell_size"], attributes["cell_size"]);

  render_array(first_array, pos_x, "first_array_");

  // calculate size_x
  max_x = Math.max(max_x, pos_x + (attributes["cell_size"] * first_array.length));

  if (matches[2]) {
    let second_array = matches[2].trim().split(' ');

    render_array(second_array, pos_x + (attributes["cell_size"] * (first_array.length + 3)), "second_array_");

    // connect arrays
    structure_dict["connections"].push({
      "from": "first_array_" + (first_array.length - 1),
      "to": "second_array_0",
      "end_arrow": "true",
      "margin": attributes["cell_size"] / 4,
    });

    // calculate size_x
    max_x = Math.max(max_x, pos_x + attributes["cell_size"] * (first_array.length + second_array.length + 3));
  }

  // connect params to cells
  for (let i = 0; i < params.length; i++) {
    structure_dict["connections"].push({
      "from": "param" + i,
      "to": params[i][1] < first_array.length ? "first_array_" + params[i][1] : "second_array_" + (params[i][1] - first_array.length),
      "end_arrow": "true",
    });
  }

  // read last line
  if (lines[2]) {
    let match = lines[2].match(/^\s*?(\w+)\s*?->\s*?(\d*)\s*?$/);
    
    const first_array_cell = pos_x + (attributes["cell_size"] * parseInt(match[2]));
    let last_param_x = match[2] < first_array.length ? first_array_cell : first_array_cell + (attributes["cell_size"] * 3);
    
    structure_dict["elements"]["last_param"] = {
      "copy": "text",
      "x": Math.max(last_param_x, match[1].length * attributes["text_size"] * 0.3),
      "y": parseInt(attributes["text_size"]) * 1.8 + parseInt(attributes["cell_size"]) * 4,
      "text_color": "#00f",
      "text": match[1],
    };

    // connect param to cell
    structure_dict["connections"].push({
      "from": "last_param",
      "to": match[2] < first_array.length ? "first_array_" + match[2] : "second_array_" + (match[2] - first_array.length),
      "end_arrow": "true",
      "margin": attributes["cell_size"] / 4,
    });

    // calculate size_x
    max_x = Math.max(max_x, last_param_x + match[1].length * attributes["text_size"] * 0.3);
  }

  structure_dict["x_size"] = max_x;
  structure_dict["y_size"] = parseInt(attributes["text_size"]) * 2.4 + parseInt(attributes["cell_size"]) * 4;

  return structure_dict;
}

function repulsive(x, k) {
  return Math.pow(k, 2) / x;
}

function attractive(x, k) {
  return Math.pow(x, 2) / k;
}

function graph(structure, attributes) {
  const attributes_defaults = {
    width: 400,
    height: 400,
    cell_size: 20
  }

  for (let key in attributes_defaults) {
    if (!(key in attributes)) attributes[key] = attributes_defaults[key];
  }

  let structure_dict = {
    "background": "#ddd",
    "elements": {
      "template": {
        "x": 0,
        "y": 0,
        "width": attributes["cell_size"],
        "height": attributes["cell_size"],
        "shape": "ellipse",
        "border_color": "#000",
        "border_width": 2,
        "text_color": "#000",
        "text_size": attributes["cell_size"] * 0.6,
      }
    },
    "connections": []
  };

  class Edge {
    constructor(from, to, value, lArrow, rArrow) {
      this.from = from;
      this.to = to;
      this.value = value;
      this.lArrow = lArrow;
      this.rArrow = rArrow;
    }
  }

  class Vector {
    constructor(x, y) {
      this.x = x;
      this.y = y;
    }

    get distance() {
      return Math.sqrt(Math.pow(this.x, 2) + Math.pow(this.y, 2));
    }

    div(scalar) {
      if (scalar == 0) {
        console.log("DIVISION BY 0");
        // for this application returning zero vector works fine
        return new Vector(0, 0);
      }
      return new Vector(this.x / scalar, this.y / scalar);
    }

    multiply(scalar) {
      return new Vector(this.x * scalar, this.y * scalar);
    }

    add(other) {
      return new Vector(this.x + other.x, this.y + other.y);
    }

    subtract(other) {
      return new Vector(this.x - other.x, this.y - other.y);
    }
  }

  class Vertex {
    constructor(pos, disp) {
      this.pos = pos;
      this.disp = disp;
    }
  }

  // read graph structure
  let regex = /^\s*?(\d*)\s*?(<?)-(>?)\s*?(\d*)\s*?(?:\((\d*)\))?\s*?$/;
  let line_match;
  let edges = [];

  for (let row of structure.split("\n")) {
    line_match = row.match(regex);

    edges.push(new Edge(line_match[1], line_match[4], line_match[5] ? line_match[5] : null, line_match[2] != "" ? true : false, line_match[3] != "" ? true : false));
  }

  let vertices = new Set();

  for (let edge of edges) {
    if (!vertices.has(edge.from)) vertices.add(edge.from);
    if (!vertices.has(edge.to)) vertices.add(edge.to);
  }

  var vertices_dict = {};
  vertices.forEach(function(value) {
    vertices_dict[value] = new Vertex(new Vector(0, 0), new Vector(0, 0));
  });

  // initialize random position for vertices
  let index = 0;
  let len = vertices.size;

  for (const [key, value] of Object.entries(vertices_dict)) {
    value.pos.x = (attributes["width"] / len) * index;
    value.pos.y = Math.sqrt((attributes["width"] / len) * index);
    index++;
  }

  // use force-directed algorithm to calculate vertices positions
  // https://cs.brown.edu/people/rtamassi/gdhandbook/chapters/force-directed.pdf
  let area = attributes["width"] * attributes["height"];
  let k = Math.sqrt(area / vertices.size);
  const max_t = attributes["width"] / 10
  let t = max_t;
  let iterations = 50;

  for (let i = 0; i < iterations; i++) {
    // calculate repulsive forces
    for (const [key, value] of Object.entries(vertices_dict)) {
      value.disp = new Vector(0, 0);
      for (const [key2, value2] of Object.entries(vertices_dict)) {
        if (key != key2) {
          let delta = value.pos.subtract(value2.pos);
          value.disp = value.disp.add(delta.div(delta.distance).multiply(repulsive(delta.distance, k)));
        }
      }
    }

    // calculate attractive forces
    for (let edge of edges) {
      let delta = vertices_dict[edge.from].pos.subtract(vertices_dict[edge.to].pos);
      vertices_dict[edge.from].disp = vertices_dict[edge.from].disp.subtract((delta.div(delta.distance)).multiply(attractive(delta.distance, k)));
      vertices_dict[edge.to].disp = vertices_dict[edge.to].disp.add((delta.div(delta.distance)).multiply(attractive(delta.distance, k)));
    }

    // apply adjustments
    for (const [key, value] of Object.entries(vertices_dict)) {
      value.pos = value.pos.add(value.disp.div(value.disp.distance).multiply(Math.min(value.disp.distance, t)));
    }

    t -= max_t / iterations;
  }

  // scale graph to viewport
  let min_x, max_x, min_y, max_y = null;

  // find the smallest rectangle that contains entire graph
  for (const [key, value] of Object.entries(vertices_dict)) {
    if (min_x == null) {
      min_x = value.pos.x;
      max_x = value.pos.x;
      min_y = value.pos.y;
      max_y = value.pos.y;
    } else {
      if (value.pos.x < min_x) min_x = value.pos.x;
      if (value.pos.x > max_x) max_x = value.pos.x;
      if (value.pos.y < min_y) min_y = value.pos.y;
      if (value.pos.y > max_y) max_y = value.pos.y;
    }
  }

  // make rectangle larger so vertices don't get clipped in walls
  min_x -= parseInt(attributes["cell_size"]);
  max_x += parseInt(attributes["cell_size"]);
  min_y -= parseInt(attributes["cell_size"]);
  max_y += parseInt(attributes["cell_size"]);
  let sWidth = max_x - min_x;
  let sHeight = max_y - min_y;

  // scale each vertex
  for (const [key, value] of Object.entries(vertices_dict)) {
    value.pos = value.pos.subtract(new Vector(min_x, min_y));
    let x_scaled = value.pos.x * (parseInt(attributes["width"]) / sWidth);
    let y_scaled = value.pos.y * (parseInt(attributes["height"]) / sHeight);
    value.pos = new Vector(x_scaled, y_scaled);
  }

  // update structure_dict
  for (const [key, value] of Object.entries(vertices_dict)) {
    structure_dict["elements"][key] = {
      copy: "template",
      x: value.pos.x,
      y: value.pos.y,
      text: key
    }
  }

  for (let edge of edges) {
    structure_dict["connections"].push({
      "from": edge.from,
      "to": edge.to,
      "text": edge.value != null ? edge.value : "",
      "start_arrow": edge.lArrow,
      "end_arrow": edge.rArrow,
      "text_height": 20,
      "text_size": attributes["cell_size"] * 0.6,
      "margin": 10,
    });
  }

  structure_dict["x_size"] = attributes["width"];
  structure_dict["y_size"] = attributes["height"];

  return structure_dict;
}

const Plugin = () => {
  function extractAttributes(text) {
    let regex = /^!\s*?[\w.]+\s*?:\s*?[\w.]+\s*?\n?/gm;
  
    // get matches
    let matches = text.match(regex);
  
    // delete matched lines
    let structure = text.replace(regex, '');
  
    // if the attribute was at the last line we need remove '\n' from the end of the string
    if (structure.slice(-1) == '\n') structure = structure.slice(0, -1); 
  
    let attributes = {};
    regex = /^!\s*?([\w.]+)\s*?:\s*?([\w.]+)\s*?\n?/;
  
    // add extracted attributes to dict
    for (let match of matches) {
      let line_match = match.match(regex);
      attributes[line_match[1]] = line_match[2];
    }
  
    return {
      structure: structure,
      attributes: attributes
    }
  }

  function drawStructure(canvas, structure, attributes) {
    console.log(structure);
    console.log(attributes);
  
    let structureDrawer = new StructureDrawer(canvas);
  
    const structures = {
      "labyrinth": labyrinth,
      "red_black_tree": red_black_tree,
      "graph": graph,
      "container": container,
    }
    console.log(attributes["type"]);
    console.log(structures[attributes["type"]](structure, attributes));
    structureDrawer.init(structures[attributes["type"]](structure, attributes));
    structureDrawer.draw();
    console.log(structureDrawer);
  }

  return {
    id: 'structures',
    init: ( deck ) => {
      let slides = deck.getSlidesElement();
      let code_tags = slides.getElementsByTagName("code");
  
      // for unique ids
      let index = 0;
  
      let pre_tags = [];
      let texts = [];
  
      // go through each <code> tag and check if it has 'structure' class
      // if yes then add to list
      for (let code_tag of code_tags) {
        for (let class_name of code_tag.getAttribute("class").split(" ")) {
          if (class_name == "structure") {
            pre_tags.push(code_tag.parentElement);
            texts.push(code_tag.textContent);
  
            index++;
          }
        }
      }
  
      let parent = null;
      let text = null;
      let canvases = null;
  
      // go through each <pre> tag and replace with <canvas>
      // then get <canvas> object and pass it to StructureDrawer
      for (let i = 0; i < pre_tags.length; i++) {
        parent = pre_tags[i];
        text = texts[i];
  
        // replace <pre><code>...</code></pre> with <canvas>
        parent.outerHTML = '<canvas id="paperCanvas' + i.toString() + '" resize></canvas>';
        canvases = slides.getElementsByTagName("canvas");
  
        for (let canvas of canvases) {
          if (canvas.id == "paperCanvas" + i.toString()) {
            const { structure, attributes } = extractAttributes(text);
            drawStructure(canvas, structure, attributes); 
          }
        }
      }
    }
  }
}

export default Plugin;
