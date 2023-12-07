# This file includes functions used to convert
# nodes into jsonld files
import os
from contextlib import contextmanager
import argparse
from rdflib import Graph
from tqdm import tqdm


# query used
QUERY = """
    PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
    PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
    PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
    
    SELECT ?concept
    WHERE {
        ?concept a skos:Concept .
    }
"""

def existing_file(path):
    if not os.path.exists(path):
        raise argparse.ArgumentTypeError(f"{path} does not exist.")
    if not os.path.isfile(path):
        raise argparse.ArgumentTypeError(f"{path} is not a file.")
    return path

def parse_arguments():
    parser = argparse.ArgumentParser(description="Convert OpenCS graph (.ttl) into single Concept files (jsonld).")
    # Input .ttl file
    parser.add_argument("input", help="Path to the .ttl file",
                        type=existing_file)
    # (Optional) Output directory (default is current working directory)
    parser.add_argument("destination", nargs="?", default=".", help="Destination path")
    # (Optional) If directory does not exist, create it
    parser.add_argument("--mkdir", help="Allow to create a directory if the dest directory does not exist", 
                        action="store_true")
    # (Optional) Show tqdm counter
    parser.add_argument("--tqdm", help="Allow to show tqdm counter", 
                        action="store_true")
    return parser.parse_args()

@contextmanager
def change_directory(new_dir, allow_mkdir=False):
    prev_dir = os.getcwd()
    if not os.path.exists(new_dir) and allow_mkdir:
        os.mkdir(new_dir)
    os.chdir(new_dir)
    try:
        yield
    finally:
        os.chdir(prev_dir)

def get_dirname_from_concept(filename):
    """Returns the directory name in which the concept should be stored"""
    concept_number = int(filename.split("C")[1])
    directory = f"{concept_number // 1000:02}" # 1000 files per dir
    return directory

def load_graph(file, format="turtle"):
    graph = Graph()
    graph.parse(file, format)
    return graph

def select_triples_with_query(graph: Graph, query: str):
    triples = graph.query(query)
    return triples

def save_graph_to_jsonld(graph: Graph, filepath: str):
    if not filepath.endswith(".jsonld"):
        filepath += ".jsonld"
    with open(f"{filepath}", "w") as f:
        f.write(graph.serialize(format='json-ld'))

def process_concepts(graph, concepts, use_tqdm=False, allow_mkdir=False):
    concepts = tqdm(concepts) if use_tqdm else concepts
    for concept in concepts:
        concept_uri = concept[0]
        with change_directory(get_dirname_from_concept(str(concept_uri)), allow_mkdir=True):
            process_single_concept(graph, concept_uri)

def process_single_concept(graph, concept_uri):
    # get triples for particular concept (by URI)
    concept_triples = graph.triples((concept_uri, None, None))
    # create a separate mini graph for each concept
    concept_graph = Graph()
    for triple in concept_triples:
        concept_graph.add(triple)
    # serialize as JSON-LD and save to file
    save_graph_to_jsonld(concept_graph, concept_uri.split('/')[-1])
    

def main():
    args = parse_arguments()
    openCS = load_graph(args.input)
    with change_directory(args.destination, allow_mkdir=args.mkdir):
        concept_triples = select_triples_with_query(openCS, QUERY)
        process_concepts(openCS, concept_triples, use_tqdm=args.tqdm, allow_mkdir=args.mkdir)


if __name__ == "__main__":
    args = parse_arguments()
    main()