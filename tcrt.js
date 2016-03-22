/*******************************************************************************
 * Thaumcraft Research Tool
 * Copyright (C) 2016 John Ratliff < john [AT] technoplaza [DOT] net >
 * Licensed under Creative Commons Attribution 4.0 International License
 *     http://creativecommons.org/licenses/by/4.0/
 *
 * Based on Thaumcraft Research Helper by yhtri
 *     http://ythri.github.io/tcresearch/
 *
 ******************************************************************************/
$(function() {
/*******************************************************************************
 * Global variable declarations
 ******************************************************************************/
// array of aspects for selectors
var aspectData = [];

// dictionary of compound aspects
// when a compound is a mix of a primal and a compound, the primal must be
// listed first
var compounds = {
    eldritch: ["void", "darkness"],
    aura: ["air", "energy"],
    aversion: ["entropy", "soul"],
    beast: ["motion", "life"],
    mind: ["fire", "soul"],
    desire: ["soul", "void"],
    undead: ["motion", "death"],
    craft: ["exchange", "tool"],
    cold: ["fire", "entropy"],
    plant: ["earth", "life"],
    man: ["soul", "life"],
    tool: ["metal", "energy"],
    light: ["air", "fire"],
    mechanism: ["motion", "tool"],
    metal: ["earth", "order"],
    death: ["water", "entropy"],
    motion: ["air", "order"],
    exchange: ["entropy", "order"],
    energy: ["order", "fire"],
    protect: ["earth", "soul"],
    senses: ["air", "soul"],
    soul: ["life", "death"],
    darkness: ["void", "light"],
    void: ["air", "entropy"],
    life: ["water", "earth"],
    trap: ["entropy", "motion"],
    taint: ["entropy", "energy"],
    crystal: ["earth", "air"],
    flight: ["air", "motion"]
};

// found connections to cycle through
var connections = {};

// dictionary of all aspects and what aspects they can connect
var graph;

// dictionary of aspect points
var points;

// array of primal aspects
var primals = ["air", "water", "fire", "earth", "order", "entropy"];

// the saved research points
var savedPoints = {1: {
    air: 5,
    water: 5,
    fire: 5,
    earth: 5,
    order: 5,
    entropy: 5
}};

// dictionary of aspect names and their english descriptions
var translate = {
    air: "aer",
    eldritch: "alienis",
    water: "aqua",
    aura: "auram",
    aversion: "aversio",
    beast: "bestia",
    mind: "cognitio",
    desire: "desiderium",
    undead: "exanimis",
    craft: "fabrico",
    cold: "gelum",
    plant: "herba",
    man: "humanus",
    fire: "ignis",
    tool: "instrumentum",
    light: "lux",
    mechanism: "machina",
    metal: "metallum",
    death: "mortuus",
    motion: "motus",
    order: "ordo",
    entropy: "perditio",
    exchange: "permutatio",
    energy: "potentia",
    protect: "praemundio",
    senses: "sensus",
    soul: "spiritus",
    darkness: "tenebrae",
    earth: "terra",
    void: "vacuos",
    life: "victus",
    trap: "vinculum",
    taint: "vitium",
    crystal: "vitreus",
    flight: "volatus"
};

// version of the tool
var version = 0.82;

/*******************************************************************************
 * Functions
 ******************************************************************************/

// add or subtract (count) of research points
function addResearchPoint(aspect, count) {
    if (aspect in points) {
        points[aspect] += count;
        if (points[aspect] < 0) points[aspect] = 0;
        $("#" + aspect).html(points[aspect]);
    } else {
        points[aspect] = count;

        $("#pointList").append('<li id="' + aspect + 'point" data-id="' +
            aspect + '"><img src="images/aspects/' + translate[aspect] +
            '.png"><span id="' + aspect + '">' + points[aspect] +
            '</span></li>');

        $("#" + aspect + "point").click(function(event) {
            var count = -1;
            var aspect = $(this).data("id");

            if (event.shiftKey) {
                count = 1;
            }

            // add or subtract a point depending upon whether we shift-clicked
            if (isPrimal(aspect)) {
                addResearchPoint(aspect, count);
            } else if (points[aspect] > 0) {
                // break down this aspect
                var components = compounds[aspect];
                addResearchPoint(aspect, -1);
                addResearchPoint(components[0], 1);
                addResearchPoint(components[1], 1);
            }
        });
    }
}

// build a compound aspect from the available points
function buildCompoundAspect(aspect, points) {
    var path = [];

    if (isPrimal(aspect)) {
        // can't build primals
        return false;
    } else {
        var components = compounds[aspect];

        if (isPrimal(components[0]) && isPrimal(components[1])) {
            if ((points[components[0]] == 0) || (points[components[1]] == 0)) {
                return false;
            }

            points[components[0]]--;
            points[components[1]]--;
        } else if (isPrimal(components[0])) {
            // first aspect is primal, second is compound
            if (points[components[0]] == 0) {
                return false;
            }

            points[components[0]]--;
            path.push(components[1]);

            if ((components[1] in points) && (points[components[1]] > 0)) {
                points[components[1]]--;
            } else {
                var newPath = buildCompoundAspect(components[1], points);

                if (newPath) {
                    path = path.concat(newPath);
                    points[components[1]]--;
                } else {
                    return false;
                }
            }
        } else {
            // both components are compound aspects
            var success = true;

            components.forEach(function(component) {
                if ((component in points) && (points[component] > 0)) {
                    points[component]--;
                } else {
                    var newPath = buildCompoundAspect(component, points);

                    if (newPath) {
                        path = path.concat(newPath);
                        points[component]--;
                    } else {
                        success = false;
                    }
                }

                path.push(component);
            });

            if (!success) {
                return false;
            }
        }
    }

    if (aspect in points) {
        points[aspect]++;
    } else {
        points[aspect] = 1;
    }

    return path;
}

// attempts to connect two aspects using the available research points
function connect(from, to, steps) {
    function search(queue, to) {
        var paths = [];
        var visited = {};
        
        while (!queue.isEmpty()) {
            // take the most promising path
            var element = queue.dequeue();
            
            // get the length of this path
            var pathLength = element.path.length - 1;

            // get the last aspect in the path
            var node = element.path[pathLength];
            
            var pathName = "";
            for (i = 0; i <= pathLength; i++) {
                pathName += element.path[i];
            }
            
            if (!(pathLength in visited)) {
                visited[pathLength] = [];
            }
            
            if (visited[pathLength].indexOf(pathName) == -1) {
                visited[pathLength].push(pathName);
                
                if ((paths.length > 0) && (pathLength > (paths[0].path.length - 2))) {
                    // stop if path is longer than paths already found
                    continue;
                }
                
                // for every aspect we can link with
                graph[node].forEach(function(aspect) {
                    // assume the path is valid until we validate it
                    var goodPath = true;
                    
                    // clone the current paths
                    var newPath = element.path.slice();
                    var newFullPath = element.fullPath.slice();
                    
                    if ((aspect == to) && (pathLength >= steps)) {
                        element.path.push(aspect);
                        paths.push(element);
                        return;
                    }
                    
                    // clone the points dictionary
                    var newPoints = $.extend({}, element.points);
                    
                    // in each aspect link, can we travel down this path
                    if (isPrimal(aspect)) {
                        if (newPoints[aspect] > 0) {
                            newPoints[aspect]--;
                        } else {
                            goodPath = false;
                        }
                    } else {
                        if ((aspect in newPoints) && (newPoints[aspect] > 0)) {
                            newPoints[aspect]--;
                        } else {
                            var path = buildCompoundAspect(aspect, newPoints);
                            
                            if (path) {
                                newFullPath.push(aspect);
                                newFullPath = newFullPath.concat(path);
                                newPoints[aspect]--;
                            } else {
                                goodPath = false;
                            }
                        }
                    }
                    
                    if (goodPath) {
                        // add this new element to the path
                        newPath.push(aspect);
                        
                        // add this path to the queue to be checked
                        queue.enqueue({
                            path: newPath,
                            fullPath: newFullPath,
                            points: newPoints
                        });
                    }
                });
            }
        }
        
        return paths;
    }
    
    var tempPoints = $.extend({}, points);
    var queue = new buckets.PriorityQueue(function(a, b) {
        return (b.path.length - a.path.length);
    });

    queue.enqueue({
        path: [from],
        fullPath: [],
        points: tempPoints
    });
    
    return search(queue, to);
}

// formats the data items in the to/from selectors
function format(item) {
    var aspect = item.id;

    return '<div class="aspect" id="' + aspect +
        '"><img style="margin: 4px 5px 0 0" src="images/aspects/' +
        translate[aspect] + '.png" /><div>' +
        translate[aspect] + '</div><div class="name">' +
        aspect + '</div></div>';
}

// setup the available research points
function initializeAspectPoints(newPoints) {
    points = {};
    $("#pointList").empty();

    $.each(newPoints, function(key, value) {
        addResearchPoint(key, value);
    });
}

function initializeGraph() {
    graph = {};

    for (compound in compounds) {
        function addLink(from, to) {
            if ((!(from in graph))) {
                graph[from] = [];
            }
            graph[from].push(to);
        }

        addLink(compound, compounds[compound][0]);
        addLink(compound, compounds[compound][1]);
        addLink(compounds[compound][0], compound);
        addLink(compounds[compound][1], compound);
    }
}

// check whether an aspect is a primal
function isPrimal(aspect) {
    return (primals.indexOf(aspect) != -1);
}

// handler for the load slot button
function onClickLoadSlotButton() {
    var slot = $("#slotSpinner").spinner("value");
    
    if (slot in savedPoints) {
        initializeAspectPoints(savedPoints[slot]);
    }
}

// handler for the reset points button
function onClickResetPointsButton() {
    var newPoints = {};
    var count = $("#resetPointsSpinner").spinner("value");
    
    primals.forEach(function (value) {
        newPoints[value] = count;
    });
        
    initializeAspectPoints(newPoints);
}

// handler for the save slot button
function onClickSaveSlotButton() {
    var slot = $("#slotSpinner").spinner("value");
    
    savedPoints[slot] = $.extend({}, points);
}

// shows the result of a connection
function showResult(connection) {
    var index = connection.index;
    var matchId = connection.matchId;
    var path = connection.paths[index].path;
    var connectionId = connection.connectionId;
    var needed = connection.paths[index].fullPath;
    var neededId = connection.neededId;
    
    $("#" + matchId).html("Showing match " + (index + 1) + " of " +
        connection.paths.length + ".");
    
    $("#" + connectionId).empty();
    $("#" + neededId).empty();
    
    for (i = 0; i < path.length; i++) {
        if (i > 0) {
            $("#" + connectionId).append('<li style="text-align: center;">&darr;</li>');
        }
        
        $("#" + connectionId).append('<li class="resultListAspect aspect" data-id="' + path[i] + '">' +
            '<img src="images/aspects/' + translate[path[i]] + '.png">' + 
            '<div>' + translate[path[i]] + '</div>' + 
            '<div class="name">' + path[i] + '</div></li>');
    }
    
    for (i = 0; i < needed.length; i++) {
        if (i > 0) {
            $("#" + neededId).append('<li style="text-align: center;">&darr;</li>');
        }
        
        $("#" + neededId).append('<li class="resultListAspect aspect" data-id="' + needed[i] + '">' +
            '<img src="images/aspects/' + translate[needed[i]] + '.png">' + 
            '<div>' + translate[needed[i]] + '</div>' + 
            '<div class="name">' + needed[i] + '</div></li>');
    }
}

/*******************************************************************************
 * Start of program
 ******************************************************************************/
 
$("#version").html(version);

// setup the starting aspect points
initializeAspectPoints(savedPoints[1]);

// setup aspect link graph
initializeGraph();

console.dir(graph);

// setup hover events for displaying components of compound aspects
$("body").on("mouseenter", ".aspectList .aspect", function() {
    var aspect = $(this).data("id");
    
    if (!isPrimal(aspect)) {
        var components = compounds[aspect];
        var elements = [$("#aspect1"), $("#aspect2")];
        
        for (i = 0; i < 2; i++) {
            elements[i].html('<img src="images/aspects/' +
                translate[components[i]] + '.png" />' +
                '<div class="thaumcraftName">' + translate[components[i]] + '</div>' +
                '<div class="name">' + components[i] + '</div>');
        }
        
        $(this).mousemove(function(event) {
            $("#componentBox").css({
                left: event.pageX + 10,
                top: event.pageY - 100}).show();
        });
        
    } else {
        $("#componentBox").hide();
    }
});

$("body").on("mouseleave", ".aspectList .aspect", function() {
    $("#componentBox").hide();
});

// setup save slot spinner
$("#slotSpinner").spinner({
    min: 1,
    max: 9
});

// setup save/load buttons click event handlers
$("#loadSlotButton").click(onClickLoadSlotButton);
$("#saveSlotButton").click(onClickSaveSlotButton);

// setup reset aspect points spinner
$("#resetPointsSpinner").spinner({
    min: 1,
    max: 9
});

// handler for reset aspect points button
$("#resetPointsButton").click(onClickResetPointsButton);

// setup the aspect list box and to/from select data
$.each(translate, function(key, value) {
    $("#aspectList").append('<li class="aspect" data-id="' + key + '">' +
        '<img src="images/aspects/' + value + '.png" />' +
        '<div class="thaumcraftName">' + value + '</div>' +
        '<div class="name">' + key + '</div></li>');

    aspectData.push({
        text: key,
        id: key
    });
});

// handler for clicking on an aspect from the aspect list
$(".aspect").click(function() {
    var id = $(this).data("id");

    if (isPrimal(id)) {
        // primals can just be added
        addResearchPoint(id, 1);
    } else {
        // compound aspects must be built
        var tempPoints = $.extend({}, points);

        if (buildCompoundAspect(id, tempPoints)) {
            initializeAspectPoints(tempPoints);
        } else {
            alert("Insufficient research points to build " +
                translate[id] + ".");
        }
    }
});

// setup to/from selectors
$("#fromSelect, #toSelect").select2({
    data: aspectData,
    formatResult: format,
    formatSelection: format,
    width: "200px",
    allowClear: false,
    sortResults: function(results, container, query) {
        return results.sort(function(a, b) {
            return translate[a.id].localeCompare(translate[b.id]);
        });
    },
    matcher: function(search, text) {
        return (text.toUpperCase().indexOf(search.toUpperCase()) >= 0) ||
            (translate[text].toUpperCase().indexOf(search.toUpperCase()) >= 0);
    }
});
$("#fromSelect, #toSelect").select2("val", "air");

// setup steps spin box
$("#stepsSpinner").spinner({
    min: 1,
    max: 10
});

// handler for the connect button
$("#connectButton").click(function() {
    var from = $("#fromSelect").select2("val");
    var to = $("#toSelect").select2("val");
    var steps = $("#stepsSpinner").spinner("value")
    
    var title = translate[from] + " &rarr; " + translate[to];
    
    var dialogName = from + "_" + to;
    
    var connectionId= dialogName + "_connection";
    var neededId = dialogName + "_needed";
    var matchId = dialogName + "_match";
    
    var cycleId = dialogName + "_cycle";
    var chooseId = dialogName + "_choose";
    
    var paths = connect(from, to, steps);
    
    if (paths.length == 0) {
        alert("Sorry. No path is available that meets all the criteria.");
        return;
    }
    
    // sort the array by the least number of steps and aspects
    paths.sort(function(a, b) {
        return ((a.fullPath.length + a.path.length) - 
            (b.fullPath.length + b.path.length));
    });
    
    connections[dialogName] = {
        paths: paths, 
        index: 0,
        connectionId: connectionId,
        neededId: neededId,
        matchId: matchId
    };
    
    var connection = connections[dialogName];
    
    $("#" + dialogName).remove();
    
    $("body").append('<div class="aspectList" id="' + dialogName + '" title="' + title + '"></div>');
    $("#" + dialogName).dialog({
        autoOpen: false,
        modal: false,
        resizable: false,
        width: 400
    });
    
    $("#" + dialogName).append('<div class="pathList"><h2>Path</h2>' + 
        '<ul class="resultList" id="' + connectionId + '"></ul></div>' +
        '<div class="pathList"><h2>Needed</h2>' +
        '<ul class="resultList" id="' + neededId + '"></ul></div>' +
        '<div style="clear: left;"></div><hr />' +
        '<p class="centered" id="' + matchId + '"></p>' +
        '<div class="centered">' + 
        '<button id="' + cycleId + '" style="margin-right: 10px">Cycle</button>' +
        '<button id="' + chooseId + '">Choose</button></div>');
    
    showResult(connection);
    
    $("#" + cycleId).click(function() {
        var index = connection.index + 1;
        
        if (index == connection.paths.length) {
            index = 0;
        }
        
        connection.index = index;
        
        showResult(connection);
    });
    
    $("#" + chooseId).click(function() {
        $("#" + dialogName).remove();
        initializeAspectPoints(connection.paths[connection.index].points);
    });

    $("#" + dialogName).dialog("open");
});
});