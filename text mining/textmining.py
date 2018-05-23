# -*- coding: utf-8 -*-
"""
Created on Thu May 17 14:07:53 2018

Version 1.2

@authors: Thijs Weenink and Fini De Gruyter

##############################################################
#                                                            #
# Output:                                                    #
# {mainterm : [[synoniemen], {pmid : score}, categorie]}    #
#                                                            #
# {PMID : [title, authors, date]}                            #
# {relationterm : {linkterm : [PMID]}                        #
#                                                            #
##############################################################

>>> REMOVE LINES 250-253 AT FINAL RELEASE <<<

"""

from Bio import Medline
from Bio import Entrez
Entrez.email = "youi.xentoo@gmail.com"

from urllib.error import HTTPError, URLError
import time
import json
import re

import matplotlib.pyplot as plt

def main():
    """
    #
    # Outputs: PMID, mainterm, relation_term
    #
    """

    search_terms = ["yam","bitter gourd"]
    for search_term in search_terms:
        # Main text mining function, PMID and mainterm are dictonaries,
        # structure can be seen on line 7-15
        PMID, mainterm, terms ,time_dict = text_mining(search_term)

        # Writes the dictionaries to JSON files
        dump_to_json(PMID, "PMID_%s" % (search_term))
        dump_to_json(mainterm, "mainterm_%s" % (search_term))

        # Plotting useful with testing
        plot(time_dict)

        # Sleeping to prevent overloading the server
        print("Sleeping 15 seconds...")
        time.sleep(15)

    # Retrieve the previously created JSON file
    PMID_search_term_data, PMID_link_term_data = load_json(search_terms[0], search_terms[1])
    # Compare 2 search terms on PMID
    relation_term = compare_two_search_word(search_terms[0], search_terms[1], PMID_search_term_data, PMID_link_term_data)

    # Write the final dictionary to JSON
    dump_to_json(relation_term, "RelationTerm_%s_%s" % (search_terms[0], search_terms[1]))
    print("Finished")


"""
#
# Comparing the two search words, returns the "relationterm" dictionary
#
"""
def compare_two_search_word(search_term, link_term, PMID_search_term_data, PMID_link_term_data):
    # {relationterm : {linkterm : [PMID]}  --> Structure
    relation_term = {}
    link_term_dict = {}

    # Set comparing to find PMID that are the same in both sets
    search_term_set = set(PMID_search_term_data.keys())
    link_term_set = set(PMID_link_term_data.keys())
    intersection_set = search_term_set.intersection(link_term_set)

    link_term_dict[link_term] = list(intersection_set)
    relation_term[search_term] = link_term_dict

    return relation_term


"""
#
# Fuctions using files
#
"""
# Writes a dictionary to a JSON file
def dump_to_json(data, filename):
    with open("%s.txt" % (filename), "w") as output_file:
        json.dump(data, output_file)
    output_file.close()

# Loads the JSON file of the search term and the link term in a dictionary to
# compare them.
def load_json(search_term, link_term):
    with open("PMID_%s.txt" % (search_term)) as file_search:
        PMID_search_term_data = json.load(file_search)
    file_search.close()

    with open("PMID_%s.txt" % (link_term)) as file_link:
        PMID_link_term_data = json.load(file_link)
    file_link.close()

    return PMID_search_term_data, PMID_link_term_data

# Loads a csv file to a dictionary
def load_csv(search_term):
    health_set = set([3,5])

# Specifies which category the term belongs to
def get_category(file, term):
    return "plant"


"""
#
# Searching NCBI
#
"""
# The main function for text mining, with configuration file
def text_mining(search_term):
    ##### Config #####
    max_amount_downloaded = 4
    max_return = 3
    max_number_of_attempts = 3
    title_weigth = 2
    abstract_weigth = 1
    ##################

    terms, amount_of_hits, record = ncbi_search(search_term)
    return ncbi_fetch(record, search_term, terms, amount_of_hits,
                      [max_amount_downloaded, max_return, max_number_of_attempts, title_weigth, abstract_weigth])


# Searches the PubMed database with the search term, returns the TranslationSet, amount of hits and the esearch record
def ncbi_search(search_term):
    #search_string = (search_term.lower())+"[TIAB] AND hasabstract[All Fields] NOT pubmed books[filter]"
    search_string = "(%s[ALL]) AND %s[TIAB] AND hasabstract[All Fields] NOT pubmed books[filter]" % (search_term.lower(), search_term.lower()) #(diabetes[ALL]) AND diabetes[TIAB]
    record = Entrez.read(Entrez.esearch(db="pubmed",
                            term=search_string,
                            usehistory="y"))

    amount_of_hits = int(record["Count"])
    try:
        translationSet = record["TranslationSet"][0]["To"]
        terms = set(re.findall('"(.*?)"', translationSet))
    except IndexError as err:
        terms = set([search_term.lower()])
    print(terms)

    aprox_time = int((amount_of_hits)/60)
    aprox_hours = int(aprox_time/60)
    print("%i results found, this will take aprox. %i minutes (%i hours)" % (amount_of_hits, aprox_time, aprox_hours))
    return terms, amount_of_hits, record
    #print(record)


# Fetches the data from the record gotten from ncbi_search(), returns all data needed
def ncbi_fetch(record, search_term, terms, amount_of_hits, config):
    time_dict = {}

    max_amount_downloaded = config[0]
    max_return = config[1]
    max_number_of_attempts = config[2]
    title_weigth = config[3]
    abstract_weigth = config[4]

    # All of the dictionaries needed in this function
    PMID_data = {}
    PMID_score = {}
    relationterm = {}
    linkterm = {}

    current_result = 1
    #out_handle = open("text_mining_record.txt", "w")
    time_dict[0] = 0
    start_time = time.time()
    for start in range(0,amount_of_hits,max_return): # amount_of_hits,max_return
        if start % 30:
            time.sleep(5)
        #print(start)
        #end = min(amount_of_hits, start+max_return)
        print("Downloading %i out of %i" % (current_result, amount_of_hits))
        attempt = 1
        fetched = False
        while attempt <= max_number_of_attempts and fetched == False:
            connection = True
            try:
                fetch_handle = Entrez.efetch(db="pubmed",rettype="medline",
                                             retmode="text",retstart=start,
                                             retmax=max_return,
                                             webenv=record["WebEnv"],
                                             query_key=record["QueryKey"])

            except HTTPError as err:
                if 500 <= err.code <= 599:
                    print("Received error from server %s" % err)
                    print("Attempt %i of %i" % (attempt, max_number_of_attempts))
                    attempt += 1
                    connection = False
                    time.sleep(15)
                else:
                    connection = False
                    raise
            except URLError as err:
                print("Connection lost")
                attempt += 1
                connection = False
                time.sleep(15)
            except Exception as err:
                print(err.with_traceback)
                connection = False

            # Only performed if there is a connection
            if connection:
                fetched = True
                current_result += 1

                records = Medline.parse(fetch_handle)

                for article in records:
                    pmid = article["PMID"]
                    title = str(article["TI"])
                    authors = ", ".join((article["AU"])).strip("[").strip("]")
                    publish_data = str(article["DP"])

                    # PMID dictionary:
                    PMID_data[pmid] = [title, authors, publish_data]

                    abstract = (article["AB"].replace("This article is protected by copyright. All rights reserved.", "")).lower()

                    # The PMID score dictionary, part of the mainterm dictionary:
                    for syn_search_term in terms:
                        syn_ti_score = (title.count(syn_search_term))*title_weigth
                        syn_ab_score = (abstract.count(syn_search_term))*abstract_weigth
                        pmid_syn_score = syn_ti_score+syn_ab_score

                        if pmid in PMID_score.keys():
                            PMID_score[pmid] += pmid_syn_score
                        else:
                            PMID_score[pmid] = pmid_syn_score
           ### End of if statement ###

        # Mostly for testing only
        time_dict[current_result-1] = ((time.time()-start_time))

        # Cuts off at a certain point, REMOVE BEFORE FINAL RELEASE
        if current_result == (max_amount_downloaded+1):
            break
        # REMOVE BEFORE FINAL RELEASE

    mainterm = main_term_dict(terms, search_term, PMID_score)

    end_time = time.time()
    total_time = end_time-start_time
    print("\nTotal time elapsed: "+str(total_time))

    return PMID_data, mainterm, terms, time_dict


"""
#
# The creation of the mainterm dictionary
#
"""
def main_term_dict(terms, search_term, PMID_score):
    mainterm = {}
    synterm = {}
    mainterm_internal_list = []

    mainterm_internal_list.append(list(terms))

    for key,item in PMID_score.items():
        #print(key,item)
        synterm[key] = item

    mainterm_internal_list.append(synterm)
    mainterm_internal_list.append(get_category("not_here.yet", search_term))
    mainterm[search_term] = mainterm_internal_list

    return mainterm


"""
#
# Plotting, mainly used for testing
#
"""
def plot(time_dict):
    #download, time = zip(sorted(time_dict.items()))

    plt.plot(*zip(*sorted(time_dict.items())))
    plt.xlabel('Downloaded articles')
    plt.ylabel('time (s)')
    plt.title('Downloaded articles vs time')
    plt.show()


"""
#
# Calling the script
#
"""
if __name__ == "__main__":
    main()


###############################################################################
###############################################################################
###############################################################################

"""
from Bio import Entrez
import time
try:
    from urllib.error import HTTPError  # for Python 3
except ImportError:
    from urllib2 import HTTPError  # for Python 2
Entrez.email = "history.user@example.com"
search_results = Entrez.read(Entrez.esearch(db="pubmed",
                                            term="Opuntia[ORGN]",
                                            reldate=365, datetype="pdat",
                                            usehistory="y"))
count = int(search_results["Count"])
print("Found %i results" % count)

batch_size = 10
out_handle = open("recent_orchid_papers.txt", "w")
for start in range(0,count,batch_size):
    end = min(count, start+batch_size)
    print("Going to download record %i to %i" % (start+1, end))
    attempt = 1
    while attempt <= 3:
        try:
            fetch_handle = Entrez.efetch(db="pubmed",rettype="medline",
                                         retmode="text",retstart=start,
                                         retmax=batch_size,
                                         webenv=search_results["WebEnv"],
                                         query_key=search_results["QueryKey"])
        except HTTPError as err:
            if 500 <= err.code <= 599:
                print("Received error from server %s" % err)
                print("Attempt %i of 3" % attempt)
                attempt += 1
                time.sleep(15)
            else:
                raise
    data = fetch_handle.read()
    fetch_handle.close()
    out_handle.write(data)
out_handle.close()


At the time of writing, this gave 28 matches - but because this is a date dependent search, this will of course vary.
As described in Section 9.12.1 above, you can then use Bio.Medline to parse the saved records.


# Previously in ncbi_fetch(), before the "except HTTPError":
    #abstract_search_count = abstract.count(search_term)
    #title_search_count = title.count(search_term)
    #score_maybe = title_search_count+abstract_search_count

    # {"bitter gourd": [["bitter gourd", "bitter", "momordica charantia"], {27190792 : 30, 27190756 : 90}, categorie]


    print("-"*40)
    print(pmid)
    print(title)
    #print(abstract)
    print("-"*40)
    print(title_search_count)
    print(abstract_search_count)
    print(score_maybe)




    #print("-"*40)
    #print("PMID: "+str(pmid)+"\nTitle: "+str(title)+"\nAuthors: "+str(authors)+"\nDate: "+str(publish_data))
    #print("-"*40)


    data = fetch_handle.read()
    fetch_handle.close()
    out_handle.write(data)


>>> REMOVE LINES 250-253 AT FINAL RELEASE <<<

"""