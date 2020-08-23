/*!
 * BATMAN Network JavaScript
 * https://github.com/JonathanFeenstra/BATMAN
 *
 * Copyright (c) 2018 Jonathan Feenstra
 * MIT License (https://github.com/JonathanFeenstra/BATMAN/blob/master/LICENSE)
 *
 * Notable contributions: Fini De Gruyter - downloading TSV files.
 *
 * This script is responsible for the network visualisation and the related
 * functionality, including searching and filtering.
 *
 * Known bugs: none.
 */

// Select svg element
var svg = d3.select("#network"),
        width = svg.node().getBoundingClientRect().width,
        height = svg.node().getBoundingClientRect().height,
        g = svg.append("g"),
        color = d3.scaleOrdinal(d3.schemeCategory20),
        maxNodeScore = 0,
        maxRelScore = 0,
        focus = false;

// Start D3 Force simulation
var simulation = d3.forceSimulation()
        .force("link", d3.forceLink().id(function (d) {
            return d.id;
        }))
        .force("charge", d3.forceManyBody()
                .strength(-400))
        .force("center", d3.forceCenter(width / 2, height / 2));

// Load JSON data
d3.json("../static/json/network.json", function (error, graph) {
    if (error)
        throw error;

    // Remove duplicate Links
    var seen = new Set();
    graph.links.forEach(function (d) {
        if (!seen.has(d.target + "-" + d.source)) {
            seen.add(d.source + "-" + d.target);
        }
    });
    graph.links = graph.links.filter(function (d) {
        return !seen.has(d.source + "-" + d.target);
    });

    // Create sets of keywords and synonyms, determine maximum nodescore
    var keywords = [];
    mainterms = [];
    graph.nodes.forEach(function (d) {
        maxNodeScore = d.nodescore > maxNodeScore ? d.nodescore : maxNodeScore;
        keywords.push(d.id);
        mainterms.push(d.id);
        d.synonyms.forEach(function (s) {
            if (s !== d.id) {
                keywords.push(s + " (" + d.id + ")");
            }
        });
    });

    // Find directly connected nodes and links, determine maximum link score
    var directConnections = {};
    graph.links.forEach(function (d) {
        directConnections[d.source + "," + d.target] = 1;
        maxRelScore = d.value > maxRelScore ? d.value : maxRelScore;
    });

    // Adjust filter values
    var minNodeScoreFilter = document.getElementById("minnodefilter"),
            maxNodeScoreFilter = document.getElementById("maxnodefilter"),
            minRelScoreFilter = document.getElementById("minrelfilter"),
            maxRelScoreFilter = document.getElementById("maxrelfilter");
    minNodeScoreFilter.setAttribute("max", maxNodeScore);
    minNodeScoreFilter.value = 0;
    minNodeScoreFilter.onchange = function () {
        filterScores();
    };
    maxNodeScoreFilter.setAttribute("max", maxNodeScore);
    maxNodeScoreFilter.value = maxNodeScore;
    maxNodeScoreFilter.onchange = function () {
        filterScores();
    };
    minRelScoreFilter.setAttribute("max", maxRelScore);
    minRelScoreFilter.value = 0;
    minRelScoreFilter.onchange = function () {
        filterScores();
    };
    maxRelScoreFilter.setAttribute("max", maxRelScore);
    maxRelScoreFilter.value = maxRelScore;
    maxRelScoreFilter.onchange = function () {
        filterScores();
    };
    displayFilterValues();

    // Display filter values
    function displayFilterValues() {
        document.getElementById("minnodeval").innerHTML = minNodeScoreFilter.value
                .toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
        document.getElementById("maxnodeval").innerHTML = maxNodeScoreFilter.value
                .toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
        document.getElementById("minrelval").innerHTML = minRelScoreFilter.value
                .toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
        document.getElementById("maxrelval").innerHTML = maxRelScoreFilter.value
                .toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    }

    // Select links
    var link = g.append("g")
            .attr("class", "link")
            .selectAll("line")
            .data(graph.links)
            .enter().append("line")
            .attr("id", function (d) {
                return d.source + "-" + d.target;
            })
            .attr("stroke-width", function (d) {
                return 2 + (d.value / maxRelScore) * 6;
            })
            .style("stroke", function (d) {
                return "rgba(0,0,0,0.1)";
            })
            .on("click", selectLink)
            .on("mouseover", highlightLink)
            .on("mouseleave", unhighlightLink);

    // Select nodes
    var node = g.append("g")
            .selectAll("circle")
            .attr("class", "node")
            .data(graph.nodes)
            .enter().append("g")
            .on("click", selectNode)
            .on("dblclick", toggleFocus)
            .on("mouseover", highlightNode)
            .on("mouseleave", unhighlightNode);

    // Add node collision
    simulation.force("collide", d3.forceCollide(function (d) {
        return 3 + (d.nodescore / maxNodeScore) * 4.5;
    }));

    // Draw nodes
    node.append("circle")
            .attr("r", function (d) {
                return 3 + (d.nodescore / maxNodeScore) * 4.5;
            })
            .attr("fill", function (d) {
                return color(d.group);
            })
            .attr("id", function (d) {
                return d.id;
            });

    // Labels
    node.append("text")
            .attr("dx", 6)
            .attr("id", function (d) {
                return d.id + "-label";
            })
            .text(function (d) {
                return d.id;
            });

    // Group to type dictionary
    var groupTypeMap = new Map();
    groupTypeMap.set(0, "Compound");
    groupTypeMap.set(1, "Health effect");
    groupTypeMap.set(2, "Unknown");
    groupTypeMap.set(3, "Organism");

    // Check if elements are directly connected
    function neighboring(a, b) {
        return directConnections[a + "," + b] || directConnections[a.id + "," + b.id] || a.id === b.id;
    }

    // Fade/unfade unconnected nodes when selecting a node
    function toggleFocus(d) {
        if (d3.event) {
            d3.event.stopPropagation();
        }
        if (!focus) {
            node.style("opacity", function (o) {
                return neighboring(d, o) | neighboring(o, d) ? 1 : 0.1;
            });
            link.style("opacity", function (o) {
                return d.index === o.source.index | d.index === o.target.index ? 1 : 0.1;
            });
            focus = true;
        } else {
            node.style("opacity", 1);
            link.style("opacity", 1);
            focus = false;
        }
    }


    // Download TSV file for a node
    function generateTSV(d) {
        if (typeof (d.articles) === "undefined") {
            window.alert("No articles for this node are available");
        }
        var str = "Authors\tDate\tPubMedID\tScore\tTitle" + "\r\n";
        for (var i = 0; i < d.articles.length; i++) {
            var line = "";
            for (var index in d.articles[i]) {
                line += d.articles[i][index] + "\t";
            }
            line.slice(0, line.Length - 1);
            str += line + "\r\n";
        }
        var uri = "data:text/tsv;charset=utf-8," + escape(str),
                downloadLink = document.createElement("a");
        downloadLink.href = uri;
        downloadLink.download = d.id.replace(" ", "_") + ".tsv";
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
    }

    // Download TSV file for a link
    function generateTSVLink(linkId, mutualArticles) {
        var str = "Authors\tDate\tPubMedID\tScore\tTitle" + "\r\n";

        for (var i = 0; i < mutualArticles.length; i++) {
            var line = '';

            for (var index in mutualArticles[i]) {
                line += mutualArticles[i][index] + '\t';
            }

            line.slice(0, line.Length - 1);

            str += line + '\r\n';
        }
        var uri = "data:text/tsv;charset=utf-8," + escape(str),
                downloadLink = document.createElement("a");
        downloadLink.href = uri;
        downloadLink.download = linkId.replace(" ", "_") + ".tsv";
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
    }

    // Remove node
    function removeNode(d) {
        if (selectedItem) {
            unselectItem();
            document.getElementById("info-content").innerHTML = "<p>Node <span style=\"color:"
                    + color(d.group) + ";\">" + d.id + "</span> removed.</p>";
        }
        if (highlightedNode) {
            unhighlightNode(highlightedNode);
            highlightedNode = false;
        }
        if (focus) {
            toggleFocus(d);
        }
        keywords = keywords.filter(function (keyword) {
            if (d.id === keyword) {
                return false;
            }
            for (var i = 0; i < keyword.split("(").length; i++) {
                if (d.id === keyword.split("(")[i].split(')')[0]) {
                    return false;
                }
            }
            return true;
        });
        fillAutocomplete();
        document.getElementById(d.id + "-option").outerHTML = "";
        graph.nodes.splice(d.index, 1);
        graph.links = graph.links.filter(function (l) {
            return l.source.id !== d.id && l.target.id !== d.id;
        });
        directConnections = {};
        graph.links.forEach(function (d) {
            directConnections[d.source.id + "," + d.target.id] = 1;
        });
        updateNetwork();
    }

    // Remove link
    function removeLink(d) {
        if (selectedItem) {
            unselectItem();
            document.getElementById("info-content").innerHTML = "<p>Link <span style=\"color:"
                    + color(d.source.group) + ";\">"
                    + d.source.id + "</span> - <span style=\"color:"
                    + color(d.target.group) + ";\">" + d.target.id
                    + "</span> removed.</p>";
        }
        if (d3.event) {
            d3.event.stopPropagation();
        }
        graph.links = graph.links.filter(function (l) {
            return !(l.source.id === d.source.id && l.target.id === d.target.id);
        });
        directConnections = {};
        graph.links.forEach(function (d) {
            directConnections[d.source.id + "," + d.target.id] = 1;
        });
        link = link.data(graph.links, function (d) {
            return d.source.id + "-" + d.target.id;
        });
        link.exit().remove();
        link = link.enter().append("line").merge(link);
        simulation.force("link").links(graph.links);
        simulation.alpha(1).restart();
    }

    // Select node
    function selectNode(d) {
        if (selectedItem) {
            unselectItem();
        }
        selectedItem = document.getElementById(d.id);
        selectedStroke = "none";
        selectedItem.style["stroke"] = "rgba(0,0,255)";
        document.getElementById(d.id + "-label").style["fill"] = "blue";
        var info = document.getElementById("info-content");
        releaseButton = document.createElement("input");
        zoomButton = document.createElement("input");
        removeButton = document.createElement("input");
        downloadButton = document.createElement("input");
        releaseButton.type = "submit";
        releaseButton.value = "Release node";
        releaseButton.onclick = function () {
            releaseNode(d);
            simulation.alpha(0.3).restart();
        };
        zoomButton.type = "submit";
        zoomButton.value = "Zoom in on node";
        zoomButton.onclick = function () {
            zoomhandler.translateTo(svg, d.x, d.y);
            zoomhandler.scaleTo(svg.transition(), 2);
        };
        removeButton.type = "submit";
        removeButton.value = "Remove node";
        removeButton.onclick = function () {
            removeNode(d);
        };
        downloadButton.type = "submit";
        downloadButton.value = "Download table";
        downloadButton.onclick = function () {
            generateTSV(d);
        };
        var infoContent = "<h3 style=\"color:"
                + color(d.group) + ";\">" + d.id + "</h3><p>Score: "
                + d.nodescore.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")
                + "</p><p>Type: <span style=\"color:" + color(d.group) + ";\">"
                + groupTypeMap.get(d.group) + "</span></p>"
                + "<p>Also known as: " + d.synonyms.join(", ") + "</p>"
                + "<p>PubMed articles: "
                + d.articles.length.toString()
                .replace(/\B(?=(\d{3})+(?!\d))/g, ".")
                + "</p><div id=\"scrollpane\"><table><tr><th>Title</th>"
                + "<th>Authors</th><th>Date</th></tr>";
        for (var i = 0; i < d.articles.length; i++) {
            infoContent += "<tr><td><a href=\"https://www.ncbi.nlm.nih.gov/pubmed/"
                    + d.articles[i].pmid + "\">" + d.articles[i].title
                    + "</a></td><td>"
                    + d.articles[i].authors + "</td><td>"
                    + d.articles[i].date
                    + "</td></tr>";
        }
        infoContent += "</table></div><p><a href=\"http://www.uniprot.org/uniprot/?query="
                + d.id + "&sort=score\">Search UniProt for \"" + d.id + "\"</a></p>";
        info.innerHTML = infoContent;
        info.appendChild(releaseButton);
        info.appendChild(zoomButton);
        info.appendChild(removeButton);
        info.appendChild(downloadButton);
    }

    // Select link
    function selectLink(d) {
        if (selectedItem) {
            unselectItem();
            if (focus) {
                toggleFocus(selectedItem);
            }
        }
        var linkId = d.source.id + "-" + d.target.id;
        info = document.getElementById("info-content");
        zoomButton = document.createElement("input");
        removeButton = document.createElement("input");
        downloadButton = document.createElement("input");
        selectedItem = document.getElementById(linkId);
        selectedStroke = "rgba(0,0,0,0.1)";
        selectedItem.style["stroke"] = "rgba(0,0,255,0.5)";
        zoomButton.type = "submit";
        zoomButton.value = "Zoom in on link";
        zoomButton.onclick = function () {
            zoomhandler.translateTo(svg, (d.source.x + d.target.x) / 2,
                    (d.source.y + d.target.y) / 2);
            zoomhandler.scaleTo(svg.transition(), 2);
        };
        removeButton.type = "submit";
        removeButton.value = "Remove link";
        removeButton.onclick = function () {
            removeLink(d);
        };
        var mutualArticles = d.source.articles.filter(function (a) {
            return d.target.articles.some(function (b) {
                return a.pmid === b.pmid;
            });
        });
        downloadButton.type = "submit";
        downloadButton.value = "Download table";
        downloadButton.onclick = function () {
            generateTSVLink(linkId, mutualArticles);
        };

        var infoContent = "<h3><span style=\"color:" + color(d.source.group)
                + ";\">" + d.source.id + "</span> - <span style=\"color:"
                + color(d.target.group) + ";\">" + d.target.id
                + "</span></h3><p>Relationship score: "
                + d.value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")
                + "</p><p>Mutual PubMed articles: "
                + mutualArticles.length.toString()
                .replace(/\B(?=(\d{3})+(?!\d))/g, ".")
                + "</p><div id=\"scrollpane\"><table>"
                + "<tr><th>Title</th><th>Authors</th><th>Date</th></tr>";
        for (var i = 0; i < mutualArticles.length; i++) {
            infoContent += "<tr><td><a href=\"https://www.ncbi.nlm.nih.gov/pubmed/"
                    + mutualArticles[i].pmid + "\">" + mutualArticles[i].title
                    + "</a></td><td>"
                    + mutualArticles[i].authors + "</td><td>"
                    + mutualArticles[i].date
                    + "</td></tr>";
        }
        infoContent += "</table></div>";
        info.innerHTML = infoContent;
        info.appendChild(zoomButton);
        info.appendChild(removeButton);
        info.appendChild(downloadButton);
    }

    // Release all nodes
    d3.select("#release").on("click", function () {
        node.each(releaseNode);
        simulation.alpha(0.3).restart();
    });

    // Handle drag events
    var draghandler = d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended);

    // Drag events
    function dragstarted(d) {
        if (!d3.event.active)
            simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
    }

    function dragged(d) {
        d.fx = d3.event.x;
        d.fy = d3.event.y;
    }

    function dragended(d) {
        if (!d3.event.active)
            simulation.alphaTarget(0);
        selectNode(d);
    }

    // Get dragsubject
    function dragsubject() {
        return simulation.find(d3.event.x, d3.event.y);
    }

    draghandler(node);
    zoomhandler(svg);

    // Add nodes and links to simulation
    simulation
            .nodes(graph.nodes)
            .on("tick", ticked)
            .force("link")
            .links(graph.links);

    updateNetwork();

    // Update on tick
    function ticked() {
        link
                .attr("x1", function (d) {
                    return d.source.x;
                })
                .attr("y1", function (d) {
                    return d.source.y;
                })
                .attr("x2", function (d) {
                    return d.target.x;
                })
                .attr("y2", function (d) {
                    return d.target.y;
                });

        node.attr("transform", function (d) {
            return "translate(" + d.x + "," + d.y + ")";
        });
    }

    // Create filter button
    var filterDiv = document.getElementById("collapsible");
    filterButton = document.createElement("input");

    filterButton.type = "submit";
    filterButton.value = "Filter";
    filterButton.onclick = function () {
        filterKeywords();
    };

    filterDiv.appendChild(filterButton);

    // Filter the network on keywords
    function filterKeywords() {
        var filters = filterDiv.getElementsByTagName("select");
        words = new Set();
        for (var i = 1; i < filters.length; i++) {
            words.add(filters[i].value);
        }
        if (focus) {
            toggleFocus(selectedItem);
        }
        if (selectedItem) {
            unselectItem();
        }
        if (highlightedNode) {
            unhighlightNode(highlightedNode);
            highlightedNode = false;
        }
        keywords = [];
        mainterms = [];
        graph.nodes = graph.nodes.filter(function (d) {
            if (words.has(d.id)) {
                mainterms.push(d.id);
                keywords.push(d.id);
                d.synonyms.forEach(function (s) {
                    if (s !== d.id) {
                        keywords.push(s + " (" + d.id + ")");
                    }
                });
            }
            return words.has(d.id);
        });
        fillAutocomplete();
        fillDropdown();
        graph.links = graph.links.filter(function (l) {
            return words.has(l.source.id) && words.has(l.target.id);
        });
        updateNetwork();
    }

    // Filter the network on scores
    function filterScores() {
        if (focus) {
            toggleFocus(selectedItem);
        }
        if (selectedItem) {
            unselectItem();
        }
        if (highlightedNode) {
            unhighlightNode(highlightedNode);
            highlightedNode = false;
        }
        displayFilterValues();
        keywords = [];
        mainterms = [];
        graph.nodes = graph.nodes.filter(function (d) {
            if (maxNodeScoreFilter.value >= d.nodescore
                    && d.nodescore >= minNodeScoreFilter.value) {
                mainterms.push(d.id);
                keywords.push(d.id);
                d.synonyms.forEach(function (s) {
                    if (s !== d.id) {
                        keywords.push(s + " (" + d.id + ")");
                    }
                });
                return maxNodeScoreFilter.value >= d.nodescore
                        && d.nodescore >= minNodeScoreFilter.value;
            }
        });
        fillAutocomplete();
        fillDropdown();
        graph.links = graph.links.filter(function (l) {
            return l.value >= minRelScoreFilter.value
                    && l.value <= maxRelScoreFilter.value
                    && graph.nodes.includes(l.source)
                    && graph.nodes.includes(l.target);
        });
        updateNetwork();
    }

    // Filter links by type
    function filterLinksByType(group) {
        if (selectedItem) {
            unselectItem();
        }
        if (d3.event) {
            d3.event.stopPropagation();
        }
        graph.links = graph.links.filter(function (l) {
            return !(l.source.group === group && l.target.group === group);
        });
        directConnections = {};
        graph.links.forEach(function (d) {
            directConnections[d.source.id + "," + d.target.id] = 1;
        });
        link = link.data(graph.links, function (d) {
            return d.source.id + "-" + d.target.id;
        });
        link.exit().remove();
        link = link.enter().append("line").merge(link);
        simulation.force("link").links(graph.links);
        simulation.alpha(1).restart();
    }

    // Add event listeners to filterbuttons
    document.getElementById("filtercomp").onclick = function () {
        filterLinksByType(0);
    };
    document.getElementById("filterhealth").onclick = function () {
        filterLinksByType(1);
    };
    document.getElementById("filterorg").onclick = function () {
        filterLinksByType(3);
    };

    // Update the network for removed nodes and Links
    function updateNetwork() {
        if (d3.event) {
            d3.event.stopPropagation();
        }
        node = node.data(graph.nodes, function (d) {
            return d.id;
        });
        node.exit().remove();
        node = node.enter().append("circle").attr("fill", function (d) {
            return color(d.group);
        })
                .attr("r", function (d) {
                    return 3 + (d.nodescore / maxNodeScore) * 4.5;
                })
                .merge(node);
        node.select("text").remove();
        node.append("text")
                .attr("dx", 6)
                .attr("id", function (d) {
                    return d.id + "-label";
                })
                .text(function (d) {
                    return d.id;
                });
        link = link.data(graph.links, function (d) {
            return d.source.id + "-" + d.target.id;
        });
        link.exit().remove();
        link = link.enter().append("line").merge(link);
        simulation.nodes(graph.nodes)
                .force("link").links(graph.links);
        simulation.alpha(0.3).restart();
    }

    // Create search button
    var searchWidget = document.getElementById("search-widget");
    var searchBar = document.getElementById("search");
    searchButton = document.createElement("input");
    var options = document.getElementById("options");

    searchButton.type = "submit";
    searchButton.value = "Search";
    searchButton.onclick = function () {
        search();
    };
    searchBar.onkeydown = function (e) {
        if (e.keyCode === 13) {
            search();
        }
    };
    options.onchange = function () {
        updateSearch();
    };

    searchWidget.appendChild(searchButton);

    // Search function
    function search() {
        if (focus) {
            toggleFocus(selectedItem);
        }
        var query = searchBar.value.toUpperCase();
        foundNode = false;
        otherNodes = svg.selectAll("circle").filter(function (d, i) {
            if (d.id.toUpperCase() === query) {
                foundNode = d;
                return false;
            } else {
                for (var i = 0; i < query.split("(").length; i++) {
                    if (d.id.toUpperCase() === query.split("(")[i].split(')')[0]) {
                        foundNode = d;
                        return false;
                    }
                }
            }
            return true;
        });
        if (foundNode) {
            document.getElementById("alert").style["display"] = "none";
            otherNodes.style("opacity", "0.1");
            d3.selectAll(".link").style("opacity", "0.1");
            var label = svg.selectAll("text");
            otherLabels = label.filter(function () {
                return this.innerHTML !== foundNode.id;
            });
            zoomhandler.translateTo(svg, foundNode.x, foundNode.y);
            zoomhandler.scaleTo(svg.transition(), 2);
            otherLabels.style("opacity", "0");
            d3.selectAll("circle, .link, text").transition()
                    .duration(2000)
                    .style("opacity", 1);
            selectNode(foundNode);
        } else {
            document.getElementById("alert").style["display"] = "block";
            document.getElementById("info-content").innerHTML = "<p>"
                    + "Oops! Keyword not found.</p><img src=\""
                    + "../static/img/sadbatman.gif\">"
                    + "<p><a href=\"../contact#message\">Ask the staff to add \""
                    + query.toLowerCase() + "\" to the network</a></p>";
        }
    }

    // Set search input with selected value and search
    function updateSearch() {
        searchBar.value = options.value;
        search();
    }

    // Fill/update search autocomplete
    function fillAutocomplete() {
      $(function () {
          $("#search").autocomplete({
              source: keywords,
              messages: {
                  noResults: "",
                  results: function (count) {}
              },
              autoFocus: true,
              classes: {"ui-autocomplete": "autocomplete"}
          });
      });
    }

    // Fill/update drop-down menu
    function fillDropdown() {
      $(function () {
          var $dropdown = $("#options");
          $dropdown.html("");
          $.each(mainterms, function (key, value) {
              $dropdown.append("<option id=\""
                      + value + "-option\" value=\"" + value + "\">" + value
                      + "</option>");
          });
      });
    }

    // Fill search autocomplete and drop-down menu when JSON is loaded
    fillAutocomplete();
    fillDropdown();
});

// Handle zoom events
var zoomhandler = d3.zoom()
        .on("zoom", zoomed)
        .scaleExtent([0.1, 15]);

// Network selection variables
var selectedItem = false;
selectedStroke = false;

// Unselect item
function unselectItem() {
    selectedItem.style["stroke"] = selectedStroke;
    if (document.getElementById(selectedItem.id + "-label")) {
        document.getElementById(selectedItem.id + "-label").style["fill"] = "black";
    }
}

// Release node
function releaseNode(d) {
    d.fx = d.fy = null;
}

// Network highlighting variables
var highlightedNode = false;
highlightedLink = false;

// Highlight node
function highlightNode(d) {
    if (highlightedNode) {
        unhighlightNode(highlightedNode);
    }
    highlightedNode = document.getElementById(d.id);
    document.getElementById(d.id + "-label").style["fill"] = "#00be00";
    highlightedNode.style["stroke"] = "rgba(0,255,0,0.8)";
}

// Unhighlight node
function unhighlightNode(d) {
    if (highlightedNode.id !== selectedItem.id) {
        document.getElementById(d.id + "-label").style["fill"] = "black";
        highlightedNode.style["stroke"] = "none";
    } else {
        document.getElementById(d.id + "-label").style["fill"] = "blue";
        highlightedNode.style["stroke"] = "rgba(0,0,255,0.8)";
    }
}

// Highlight link
function highlightLink(d) {
    if (highlightedLink) {
        unhighlightLink(highlightedLink);
    }
    highlightedLink = document.getElementById(d.source.id + "-" + d.target.id);
    highlightedLink.style["stroke"] = "rgba(0,255,0,0.5)";
}

// Unhighlight link
function unhighlightLink(d) {
    if (highlightedLink !== selectedItem) {
        highlightedLink.style["stroke"] = "rgba(0,0,0,0.1)";
    } else {
        highlightedLink.style["stroke"] = "rgba(0,0,255,0.3)";
    }
}

// Zoom event
function zoomed() {
    if (d3.event.sourceEvent && d3.event.sourceEvent.type === "wheel") {
        g.transition().duration(100).attr("transform", d3.event.transform);
    } else {
        g.attr("transform", d3.event.transform);
    }
}

// Expand or collapse advanced options
function toggleAdvanced() {
    var collapsible = document.getElementById("collapsible");
    toggleAdv = document.getElementById("toggle-advanced");
    if (collapsible.style["display"] === "block") {
        toggleAdv.innerHTML = "+ More options";
        collapsible.style["display"] = "none";
    } else {
        toggleAdv.innerHTML = "- Hide options";
        collapsible.style["display"] = "block";
    }
}

// Add a keyword filter
function addKeywordFilter() {
    var div = document.getElementById("keyword-filter");
    filterId = "kwfilter"
            + (parseInt(div.getElementsByTagName("span").length) + 1);
    label = document.createElement('label');
    span = document.createElement('span');
    keywordFilter = document.createElement('select');
    label.id = filterId;
    span.onclick = function () {
        this.parentNode.outerHTML = "";
    };
    span.innerHTML = "- Remove";
    keywordFilter.innerHTML = document.getElementById("options").innerHTML;
    label.appendChild(span);
    label.appendChild(keywordFilter);
    div.appendChild(label);
}

// Download SVG
function downloadSVG() {
    $("svg").attr({version: '1.1', xmlns:"http://www.w3.org/2000/svg"});
    this.href = "data:image/svg+xml;base64,\n" + btoa(unescape(encodeURIComponent($('#network-div').html())));
}

// Add download event listener to link
document.getElementById("download").addEventListener("click", downloadSVG, false);
