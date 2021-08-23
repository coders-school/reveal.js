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

function containers(structure, attributes) {
  const attributes_defaults = {
    text_size: 20
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

const Plugin = () => {
  function extractAttributes(text) {
    let regex = /^!.+:.+\n?/gm;
  
    // get matches
    let matches = text.match(regex);
  
    // delete matched lines
    let structure = text.replace(regex, '');
  
    // if the attribute was at the last line we need remove '\n' from the end of the string
    if (structure.slice(-1) == '\n') structure = structure.slice(0, -1); 
  
    let attributes = {};
    regex = /^!(.+):(.+)\n?/;
  
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
      "red_black_tree": red_black_tree
    }
  
    structureDrawer.init(structures[attributes["type"]](structure, attributes));
    structureDrawer.draw();
    // console.log(structureDrawer);
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
