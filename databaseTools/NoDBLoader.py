import traceback
import json

def get_data(synonymDict, pmidDict, linkDict):
    try:
        data = __create_JSON_data(synonymDict, pmidDict, linkDict)             # Haalt de data op vanuit de db
        __create_JSON(data)                          # Maakt van de db data een JSON bestand voor de applicatie
    except Exception as e:
        print(str(traceback.format_exc()))          # Laat de error zien als deze heeft plaats gevonden. Vanwege de brede scala aan SQL errors is er voor gekozen om de algemene Exception te pakken en de details te laten printen voor de developer

# Methode die van de db data maakt voor een json bestand
def __create_JSON_data(synonymDict, pmidDict, linkDict):
    catDict = {}                                    # Een dict die bij houdt welke categorien er al zijn geweest
    catMax = 1                                      # Index variable om bij te houden welke kleur getal d3 moet gebruiken
    data = dict()                                   # Dict waar alles in wordt opgeslagen
    data["nodes"] = []                              # Maak nodes key aan om de node data in op te slaan
    data["links"] = []                              # Maak links key voor de link data
    linkMemory = []                                 # Houdt bij welke links er al zijn gemaakt om duplicaten te voorkomen
    for hoofdTerm in synonymDict.keys():
        category = synonymDict[hoofdTerm][2]
        nodeScore = __get_node_score(synonymDict[hoofdTerm][1])
        synonyms = synonymDict[hoofdTerm][0]
        nodePmidDict = getNodePmidDict(synonymDict[hoofdTerm][1],pmidDict)

        data, catDict, catMax = __create_nodes(hoofdTerm, category,
                                               nodeScore, synonyms,
                                               nodePmidDict, data,
                                               catDict, catMax)
        data, linkMemory = __create_links(linkDict[hoofdTerm], hoofdTerm, data, linkMemory, synonymDict,linkDict)
    return data

# Methode om JSON bestand te maken
def __create_JSON(data):
    bestand = open(r'networkTest.json','w')
    json.dump(data, bestand, indent=4, sort_keys=True, default=str)
    bestand.close()

# Methode om de nodes data op te slaan in de data dict
def __create_nodes(term, category, nodeScore, synonyms, pmidDict, data, catList, catMax):
    group, catList, catMax = __get_category_int(category, catList, catMax)
    data["nodes"].append({
        'id' : term,
        'group' : group,
        'nodeScore' : nodeScore,
        'synonyms' : synonyms,
        'articles' : []
    })
    index = len(data["nodes"])-1
    for pmid in pmidDict.keys():
        data["nodes"][index]["articles"].append({
            'pmid' : pmid,
            'title' : pmidDict[pmid][0],
            'authors' : pmidDict[pmid][1],
            'date' : pmidDict[pmid][2],
            'score' : pmidDict[pmid][3]
        })
    return data, catList, catMax

# Methode om de link data op te slaan in de data dict
def __create_links(linkDict, hoofdterm, data, linkMemory,synonymDict,superLinkDict):
    for linkTerm in linkDict.keys():
        bekend = False
        for lijst in linkMemory:
            if lijst.__contains__(hoofdterm) and lijst.__contains__(linkTerm):
                bekend = True

        if not bekend:
            data["links"].append({
                'source' : hoofdterm,
                'target' : linkTerm,
                'value' : getLinkScore(superLinkDict[hoofdterm][linkTerm],synonymDict[hoofdterm][1],synonymDict[linkTerm][1])
            })
            linkMemory.append([hoofdterm,linkTerm])

    return data,linkMemory

def __get_category_int(category, catList, catMax):
    if catList.keys().__contains__(category):
        return catList[category], catList, catMax
    else:
        catList[category] = catMax
        return catMax, catList, catMax+1

def __get_node_score(pmidDict):
    score = 0
    for pmid in pmidDict.keys():
        score += int(pmidDict[pmid])
    return score

def __get_node_score_dict(synonymDict):
    dict = {}
    for term in synonymDict.keys():
        dict[term] = __get_node_score(synonymDict[term][1])
    return dict

def getNodePmidDict(nodeDict,pmidDict):
    nodePmidDict = {}
    for pmid in nodeDict.keys():
        nodePmidDict[pmid] = (pmidDict[pmid] + [nodeDict[pmid]])
    return nodePmidDict

def getLinkScore(pmidList,scores1,scores2):
    score = 0
    for pmid in pmidList:
        score += (scores1[pmid] + scores2[pmid])
    return score

