# -*- coding: utf-8 -*-
"""
Created on Mon May 28 12:55:14 2018

@author: thijs
"""

import NoDBLoader
import json

def main():
    filenames = ["relations", "pmid", "synonym"]
    relation_dict, pmid_dict, synonym_dict = get_dicts(filenames[0], filenames[1], filenames[2])
    NoDBLoader.get_data(synonym_dict, pmid_dict, relation_dict)

def get_dicts(relation, pmid, synonym):
    with open("%s.txt" % (relation), "r") as relations_file:
        relation_dict = json.load(relations_file)
    relations_file.close()
    
    with open("%s.txt" % (pmid), "r") as pmid_file:
        pmid_dict = json.load(pmid_file)
    pmid_file.close()
    
    with open("%s.txt" % (synonym), "r") as synonym_file:
        synonym_dict = json.load(synonym_file)
    synonym_file.close()
    
    return relation_dict, pmid_dict, synonym_dict


main()
