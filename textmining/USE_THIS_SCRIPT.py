# -*- coding: utf-8 -*-
"""
Created on Thu May 31 13:54:08 2018

@author: Thijs Weenink

Function for calling the text mining script, select a list of words from
"search_lists.py". Dont edit other files unless needed.

Version 1.0

"""

import textmining
import search_lists


def main():
    # Select a list of searchterms here
    search_list = search_lists.list_search_2
    # Give your list a name so you can find it later
    search_name = "list_search_2"

    # DONT TOUCH THIS
    textmining.main(search_list, search_name)


main()
