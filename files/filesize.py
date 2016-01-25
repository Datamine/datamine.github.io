# John Loeber | Python 2.7.4 | Debian Linux | July 4, 2014 | Matplotlib 1.2.1
# Documentation at johnloeber.com/docs/filesize_documentation.html

import os
import pylab as pl
import numpy as np
import matplotlib.gridspec as gridspec
from sys import argv,exit
from math import log
from time import time

# INSTRUCTIONS
# This script takes three command-line arguments: 
#	(1) absolute path of folder to traverse: e.g. '~/Documents/'.
#	(2) 'y' or 'n' depending on whether you want hidden files/folders to be 
#		included, or not. (AFAIK this works on UNIX-systems only.)		
#	(3) 'y' or 'n' depending on whether you want the output charts to be saved 
#       to your working directory, or not.

# Note that depending on your administrative privileges, you may not be able to 
# call this function on certain paths, e.g. those containing exclusively 
# root/admin-accessible folders. Users with small monitors/low resolutions may 
# have difficulties with the output windows. Sorry.

# BUGS
# The only currently known bug is that the program doesn't work when called on 
# "/", as some of the files are not normal files (e.g. /dev/core) which return 
# extremely large, mis-representative values.

def magnitude(x): 
    """
    Returns the order of magnitude of an integer. 
    """
	if x!=0:
		return int(log(x,10))
	return 0

def error():
    """
    Error message for user failing to submit correct arguments.
    """
	print "Open filesize.py in a text editor and read the documentation inside."
	exit(1)

def start():
    """
    Checks the number of arguments.
    """
	if len(argv)!=4:
		print "Error! Incorrect number of arguments. Call \"python" \
		" filesize.py your-path-here ignore-hidden-files save-graphs\"."
		error()	

def getarg(n):
	"""
    Parses arguments.
    """
    if argv[n].lower()=='y':
		return True
	elif argv[n].lower()=='n':
		return False
	print "Error! Second command not recognized. 'y' or 'n' are acceptable inputs."
	error()


def truncate(f): 
    """
    truncates float to 4 DP (not general for all floats, just for this problem)	
    """
    x = len("%.*f" %(4,f)) #change the 4 to change the truncation length
	return str(f)[:x]
	
def stringify(strata):
	"""
    creates the descriptions of the labels on the pie chart	
    """
    new = []
	for x in strata:
		if x>=1000000000000:
			new.append(str(x/1000000000000)+" TB")
		elif x>=1000000000:
			new.append(str(x/1000000000)+" GB")
		elif x>=1000000:
			new.append(str(x/1000000)+" MB")
		elif x>=1000:
			new.append(str(x/1000)+" kB")
		else:
			new.append(str(x)+" B")
	return new

def floatrunc(p):
	"""
    formats a number of bytes to improve readability
    """
    if p>=1000000000000:
		return truncate(p/1000000000000.0) + " TB"
	elif p>=1000000000:
		return truncate(p/1000000000.0) + " GB"
	elif p>=1000000:
		return truncate(p/1000000.0) + " MB"
	elif p>=1000:
		return truncate(p/1000.0) + " kB"
	else:
		return str(p) + " B"

def pietuple(occurrences,filesizes):
	"""
    This creates the actual 'pie' of the pie chart.
    """
    maxf = magnitude(max(filesizes))
	minf = magnitude(min(filesizes))
	strata = [10**x for x in range(minf,maxf+2)] 
	#+1 just for the range to be inclusive, +2 to really get the upper bound
	if 1 in strata:
		strata[strata.index(1)]=0 #to set bounds
	total = 0
	for i in range(0,len(occurrences)):
		total += occurrences[i]*filesizes[i]
	zeroes = [0]*len(strata)
	stratdictsize = dict(zip(strata,zeroes))
	stratdictfreq = dict(zip(strata,zeroes))

	for j in range(0,len(filesizes)):
		bucket = 0
		for k in range(0,len(strata)-1):
			if strata[k] < filesizes[j] <= strata[k+1]:
				bucket = strata[k]
				break
		stratdictsize[bucket] += filesizes[j] * occurrences[j]
		stratdictfreq[bucket] += occurrences[j]
	
	reciprocal = 1.0/total
	fracs = []
	for x in range(0,len(strata)-1):
		fracs.append(stratdictsize[strata[x]] * reciprocal)
	labels = []
	stratastrings = stringify(strata)
	for y in range(0,len(strata)-1):
		p = stratdictsize[strata[y]]
		num = floatrunc(p)
		labels.append(stratastrings[y] + " to " + stratastrings[y+1] + 
		": " + str(stratdictfreq[strata[y]]) + " Files. Total Size: " + num)
		#(I decided to add spaces in the label-strings for readability, 
		# even though that is not quite proper.)
	
	# some bits for pie chart formatting adapted from:
	# http://nxn.se/post/46440196846/making-nicer-looking-pie-charts-with-matplotlib
	cmap = pl.cm.prism
	colors = cmap(np.linspace(0.2, 0.8, len(fracs)))
	explode = [0.00]*len(colors) 
	#I turned explode off. Turn it on if you like.
	return fracs,colors,explode,labels,total

# Pie chart construction split into two functions so the 
# list/dictionary-processing isn't done twice (as we really make two pie charts).
def makepie(dummy,fracs,colors,explode,labels,total): 
	if not dummy:
		pl.title("Total Space Used by File Size")
		pie = pl.pie(fracs,autopct='%1.2f%%',colors=colors,labeldistance=1.1,
					 explode=explode,radius=1.5)
		for pie_slice in pie[0]: 
		# set pie slice line width: http://stackoverflow.com/a/1916809
			pie_slice.set_lw(0)
	else:
		pie = pl.pie(fracs,colors=colors,radius=0.01)
		for group in pie[1:]:
			for x in group:
				x.set_visible(False)
		Title = "Total Size: " + floatrunc(total)	
		pl.legend(labels,loc='center',title = Title)
	return pie	

def histogram(occurrences,filesizes):
	"""
    Makes the bar chart, returning a plot that is ready to be shown.
    """
    biglist = []
	for x in range(len(occurrences)):
		biglist.extend([filesizes[x]] * occurrences[x]) 
		# Above: A disgustingly lazy way of making a bar-chart... However, it
		# was still certainly quick enough to pass quite intensive tests.
	plot = pl.hist(biglist,bins=100)
	pl.yscale('symlog',nonposy='clip') 
	# Difference between log and symlog: on a log-scale, (0,10^0=1) is the origin;
	# on symlog it is (0,0), i.e. the plot behaves quasi-linearly around 0.
	pl.xlabel("Filesize in KiloBytes")
	pl.ylabel("Number of Files\n(Base-10 Logarithmic [Symlog] Scale)",
			  multialignment='center')
	pl.title('Number of Files by Size\n')
	return plot	

def main():
	start()
	path = argv[1]
	ignore = getarg(2)
	save = getarg(3)	
	
	# This section: explores the filesystem, collects filesize data.
	sizedict = {}
	for root, dirs, files in os.walk(path):
    		if ignore:
			# if you want to traverse only hidden files (for whatever reason),
			# just remove the 'not's in the two lines below.
			files = [f for f in files if not f[0] == '.'] 
    			dirs[:] = [d for d in dirs if not d[0] == '.']
    			# above: from http://stackoverflow.com/a/13454267
		# "name in files": note that this omits the countless '4096' sizes of 
		# folders (something similar should be the case for non-UNIX OSes).
		for name in files:  
			p = os.path.join(root,name)
			if not os.path.exists(p):
				continue
			x = os.stat(p).st_size
			#if x>100000000000:
			#	continue
			if x in sizedict:
				sizedict[x]+=1
			else:
				sizedict[x]=1
	
	occurrences = sizedict.values()
	filesizes = sizedict.keys() #bytes
	kbfilesizes = map(lambda x: x/1000,sizedict.keys())
	
	# Data collected. Next Section: graph plotting.
	# Not showing both in one diagram because it might be too small/annoying 
	# scaling. Two diagrams leaves the arrangement up to the user.
	
	# Bar Chart
	f = pl.figure(0)
	f.canvas.set_window_title('Bar Chart of File Frequency by Size')
	histogram(occurrences,kbfilesizes)
	if save:
		t = str(int(time()))
		pl.savefig("filesize_barchart_"+t+".pdf") 
		# can change extension to .pdf to get vectorized output. 
		# See http://stackoverflow.com/q/9622163 if you have trouble with this.
	
	# Pie Chart. This is done in two steps.
	# Step 1: Make the actual pie chart.
	g = pl.figure(1,figsize=(7,10))
	gs = gridspec.GridSpec(2, 1,height_ratios=[2,1],width_ratios=[1,0])
	g.canvas.set_window_title('Pie Chart of Total Space Used by File Size')
	
	pl.subplot(gs[0])
	pieprops = pietuple(occurrences,filesizes)
	makepie(False,*pieprops)
	pl.axis('equal')
	
	# Step 2: Make an underlying pie-chart to show labels.
	pl.subplot(gs[1])
	makepie(True,*pieprops)
	pl.tight_layout(rect=[0,0.05,1,1]) #to prevent long legends from being cut off
	if save:
		pl.savefig("filesize_piechart_"+t+".pdf") 
		# can change extension to .pdf to get vectorized output. 
		# See http://stackoverflow.com/q/9622163 if you have trouble with this.
	pl.show()	

if __name__=='__main__':
	main()
